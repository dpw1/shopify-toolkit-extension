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

const SHOPIFY_THEME_PROBE_MS = [0, 200, 500]

/**
 * Returns true only when the **page** main world exposes a Shopify theme object
 * (`window.Shopify.theme`). Uses `world: 'MAIN'` so this matches real storefront JS.
 * Retries briefly so the popup can open before `Shopify` finishes booting.
 */
export async function checkActiveTabHasShopifyTheme(): Promise<boolean> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    if (!tab?.id || !tab.url) return false
    try {
      const u = new URL(tab.url)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    } catch {
      return false
    }

    for (const delay of SHOPIFY_THEME_PROBE_MS) {
      if (delay) await new Promise((r) => setTimeout(r, delay))
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: 'MAIN',
          func: () => {
            try {
              const t = (window as unknown as { Shopify?: { theme?: unknown } }).Shopify?.theme
              return t != null && typeof t === 'object'
            } catch {
              return false
            }
          },
        })
        if (results[0]?.result === true) return true
      } catch {
        /* not injectable yet or restricted URL — try next delay */
      }
    }
    return false
  } catch {
    return false
  }
}

/**
 * Popup → Background trigger for the on-demand Shopify scan.
 * Background forwards it to the active tab content script and relays status.
 * Uses `lastFocusedWindow` (same as theme probe / domain resolve) so the tab
 * behind the popup is always the one scanned — `currentWindow` can mis-resolve
 * from the extension UI in some cases.
 */
export function requestContentShopScanFromPopup(): Promise<{ ok?: boolean; error?: string }> {
  return new Promise((resolve) => {
    try {
      console.log('[SpyKit Popup] starting app detection...')
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id
        if (tabId == null) {
          resolve({ ok: false, error: 'no_active_tab' })
          return
        }
        chrome.runtime.sendMessage(
          {
            type: 'SPYKIT_RUN_SHOP_SCAN',
            from: 'popup',
            payload: { tabId },
          } satisfies ExtMessage,
          (res: unknown) => {
            if (chrome.runtime.lastError) {
              resolve({ ok: false, error: chrome.runtime.lastError.message })
              return
            }
            const r = res as { ok?: boolean; result?: unknown; error?: string } | undefined
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
            resolve(r ?? { ok: false, error: 'no_response' })
          },
        )
      })
    } catch (e) {
      resolve({ ok: false, error: String(e) })
    }
  })
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
  products: CatalogProductRow[]
  collections: CatalogCollectionRow[]
}

export type FetchAllDataStep =
  | 'fetching-store'
  | 'fetching-collections'
  | 'fetching-products'
  | 'fetching-apps'
  | 'done'

/**
 * Step-by-step popup data load with per-step toast notifications:
 *  1. Resolve domain + read store metadata   → "Fetching store data"
 *  2. Read collections from IndexedDB        → "Fetching collections"
 *  3. Read products from IndexedDB           → "Fetching products"
 *  4. Trigger app detection (content scan)   → "Fetching apps"
 */
export async function fetchAllData(
  onStep?: (step: FetchAllDataStep) => void,
): Promise<PopupStoreBundle | null> {
  // ── Step 1: store metadata ────────────────────────────────────────────────
  onStep?.('fetching-store')
  emitSpykitToast('Fetching store data')

  const hint = await resolveActiveTabShopDomain()
  if (!hint) return null

  const slim = await loadStoreMetadataFromExtension(hint)
  const idbDomain = normalizeStoreDomainKey(slim?.domain ?? hint)

  // ── Step 2: collections ───────────────────────────────────────────────────
  onStep?.('fetching-collections')
  emitSpykitToast('Fetching collections')

  const collections = await loadCollectionsFromIndexedDb(idbDomain)

  // ── Step 3: products ──────────────────────────────────────────────────────
  onStep?.('fetching-products')
  emitSpykitToast('Fetching products')

  const products = await loadProductsFromIndexedDb(idbDomain)

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
    try {
      chrome.runtime.sendMessage({ type: 'SYNC_CATALOG_ON_POPUP', from: 'popup' } satisfies ExtMessage)
    } catch {
      /* ignore */
    }
  }

  // ── Step 4: apps (re-fetched on every popup open) ─────────────────────────
  onStep?.('fetching-apps')
  emitSpykitToast('Fetching apps')

  onStep?.('done')

  return { storeInfo, domain: idbDomain, products, collections }
}

/**
 * Lightweight re-read of store metadata + IDB catalog without toast steps.
 * Used for storage-change refreshes.
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

  return { storeInfo, domain: idbDomain, products, collections }
}
