/**
 * Central orchestration for popup store data:
 *  1. Resolve canonical shop domain in the active tab (`Shopify.shop` → `/meta.json` → hostname).
 *  2. Load lightweight metadata via background (`GET_STORE_INFO`).
 *  3. Load heavy catalog rows from IndexedDB (`by_domain`).
 *  4. If nothing is cached yet, ask the background to run a full catalog sync.
 *
 * `window.storeData` is updated from `useStoreInfo` via `syncPopupStoreData`, which
 * reads the **IndexedDB** catalog for `storeInfo.domain` (not only the in-memory sample).
 * whenever the merged `StoreInfo` changes.
 */

import type { CatalogCollectionRow, CatalogProductRow, ExtMessage, StoreInfo } from '../../types'
import { resolveShopDomainInPage } from '../../lib/injected/resolveShopDomain'
import { normalizeStoreDomainKey } from '../../lib/storeDomain'
import { dbGetByDomain, STORE_COLLECTIONS, STORE_PRODUCTS } from '../../lib/db'
import { emitSpykitToast } from './spykitToastBus'

const RESOLVE_RETRY_MS = [0, 150, 350]

/**
 * Popup → Background trigger for the on-demand Shopify scan.
 * Background forwards it to the active tab content script and relays status.
 */
export function requestContentShopScanFromPopup(): void {
  try {
    console.log('[SpyKit Popup] starting app detection...')
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      chrome.runtime.sendMessage(
        {
          type: 'SPYKIT_RUN_SHOP_SCAN',
          from: 'popup',
          payload: { tabId },
        } satisfies ExtMessage,
        (res: unknown) => {
          // Debug: print raw standalone detector `result` object from content/page-world.
          const r = res as { ok?: boolean; result?: unknown; error?: string } | undefined
          debugger
          if (r?.ok) {
            console.log('[SpyKit Popup] app-standalone result', {
              hasResult: r.result != null,
              result: r.result ?? null,
            })
          } else if (r?.error) {
            const expectedNoReceiver = r.error.toLowerCase().includes('receiving end does not exist')
            if (!expectedNoReceiver) {
              console.warn('[SpyKit Popup] SPYKIT_RUN_SHOP_SCAN error:', r.error)
            }
          }
        },
      )
    })
  } catch {
    /* ignore */
  }
}

// ─── Step 1: domain ───────────────────────────────────────────────────────────

/**
 * Runs in the storefront tab: `Shopify.shop` → `/meta.json` → hostname.
 * Retries a few times because the popup can open before `window.Shopify` exists.
 */
export async function resolveActiveTabShopDomain(): Promise<string | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    if (!tab?.id || !tab.url) return null
    try {
      const u = new URL(tab.url)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    } catch {
      return null
    }

    for (const delay of RESOLVE_RETRY_MS) {
      if (delay) await new Promise((r) => setTimeout(r, delay))
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: resolveShopDomainInPage,
        })
        const v = results[0]?.result
        if (typeof v === 'string' && v.trim()) return normalizeStoreDomainKey(v)
      } catch {
        /* not injectable */
      }
    }

    try {
      return normalizeStoreDomainKey(new URL(tab.url).hostname)
    } catch {
      return null
    }
  } catch {
    return null
  }
}

// ─── Step 2: metadata (chrome.storage via background) ─────────────────────────

/** Slim `StoreInfo` from `storeCacheByDomain` (no product arrays). */
export async function loadStoreMetadataFromExtension(hostHint: string): Promise<StoreInfo | null> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        {
          type: 'GET_STORE_INFO',
          from: 'popup',
          payload: { host: hostHint },
        } satisfies ExtMessage,
        (res: ExtMessage | undefined) => {
          if (chrome.runtime.lastError) {
            resolve(null)
            return
          }
          if (res?.type === 'STORE_INFO_RESPONSE') resolve(res.payload)
          else resolve(null)
        },
      )
    } catch {
      resolve(null)
    }
  })
}

// ─── Step 3: catalog (IndexedDB) ──────────────────────────────────────────────

export async function loadProductsFromIndexedDb(domain: string): Promise<CatalogProductRow[]> {
  try {
    return await dbGetByDomain<CatalogProductRow>(STORE_PRODUCTS, normalizeStoreDomainKey(domain))
  } catch {
    return []
  }
}

export async function loadCollectionsFromIndexedDb(domain: string): Promise<CatalogCollectionRow[]> {
  try {
    return await dbGetByDomain<CatalogCollectionRow>(
      STORE_COLLECTIONS,
      normalizeStoreDomainKey(domain),
    )
  } catch {
    return []
  }
}

export async function loadCatalogFromIndexedDb(domain: string): Promise<{
  products: CatalogProductRow[]
  collections: CatalogCollectionRow[]
}> {
  const key = normalizeStoreDomainKey(domain)
  const [products, collections] = await Promise.all([
    loadProductsFromIndexedDb(key),
    loadCollectionsFromIndexedDb(key),
  ])
  return { products, collections }
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export type PopupStoreBundle = {
  storeInfo: StoreInfo
  /** Canonical domain used for IDB + cache (matches `storeInfo.domain`). */
  domain: string
}

/**
 * Full popup load: resolve domain → metadata → IDB catalog → optional sync kickoff.
 * Call this when the popup opens (and whenever `storeCacheByDomain` changes).
 */
export async function loadPopupStoreBundle(): Promise<PopupStoreBundle | null> {
  const hint = await resolveActiveTabShopDomain()
  if (!hint) return null

  const slim = await loadStoreMetadataFromExtension(hint)
  const idbDomain = normalizeStoreDomainKey(slim?.domain ?? hint)

  const { products, collections } = await loadCatalogFromIndexedDb(idbDomain)

  const storeInfo: StoreInfo = {
    ...(slim ?? {
      domain: idbDomain,
      theme: null,
      apps: [],
      productCount: 0,
      collectionCount: 0,
      detectedAt: Date.now(),
      catalogFullDataInIndexedDb: false,
    }),
    domain: idbDomain,
    productsSample: products,
    collectionsSample: collections,
  }

  const needsCatalogSync =
    !storeInfo.catalogFullDataInIndexedDb &&
    storeInfo.catalogLoading !== true &&
    products.length === 0

  if (needsCatalogSync) {
    emitSpykitToast('Starting catalog sync — fetching products & collections…')
    try {
      chrome.runtime.sendMessage({ type: 'SYNC_CATALOG_ON_POPUP', from: 'popup' } satisfies ExtMessage)
    } catch {
      /* ignore */
    }
  }

  return { storeInfo, domain: idbDomain }
}
