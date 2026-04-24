/**
 * Background service worker (ES module).
 *
 * Responsibilities:
 *  - Receive store detection signals from content scripts
 *  - Fetch Shopify JSON endpoints (products, collections, theme metadata)
 *  - Persist results via chrome.storage / IndexedDB lib
 *  - Forward progress updates to the popup via chrome.runtime.sendMessage
 *
 * SW lifetime: Chrome may suspend the SW between events. For long-running
 * fetches, use an offscreen document + a periodic message back to the SW
 * to extend its lifetime (see keepAlive pattern below).
 */

import type {
  CatalogCollectionRow,
  CatalogProductRow,
  ExtMessage,
  ShopifyApp,
  ShopifyTheme,
  StoreInfo,
} from '../types'
import { storageGet, storageSet } from '../lib/storage'
import {
  dbPutMany,
  dbClear,
  dbGetAll,
  STORE_PRODUCTS,
  STORE_COLLECTIONS,
} from '../lib/db'

declare const __APP_MODE__: string
declare const __APP_VERSION__: string

const IS_DEV = __APP_MODE__ === 'development'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(...args: unknown[]) {
  if (IS_DEV) console.log('[SpyKit BG]', ...args)
}

async function sendToPopup(msg: ExtMessage) {
  try {
    await chrome.runtime.sendMessage(msg)
  } catch {
    // Popup may be closed — ignore
  }
}

/** Turn injected-script partial theme into persisted `ShopifyTheme`. */
function normalizeThemePayload(raw: Partial<ShopifyTheme> | undefined): ShopifyTheme | null {
  if (!raw || Object.keys(raw).length === 0) return null

  /** `Shopify.theme.schema_name` — never use `Shopify.theme.name` here. */
  const name =
    raw.schemaName != null && String(raw.schemaName).trim()
      ? String(raw.schemaName).trim()
      : 'Unknown'

  /** `Shopify.theme.schema_version` only (ignore a wrong `version` on stale payloads). */
  const version =
    raw.schemaVersion != null && String(raw.schemaVersion).trim()
      ? String(raw.schemaVersion).trim()
      : ''

  /** `Shopify.theme.name` — migrate old `themeRename` key from storage. */
  const themeRenamed =
    raw.themeRenamed != null && String(raw.themeRenamed).trim()
      ? String(raw.themeRenamed).trim()
      : (raw as { themeRename?: string }).themeRename != null &&
          String((raw as { themeRename?: string }).themeRename).trim()
        ? String((raw as { themeRename?: string }).themeRename).trim()
        : undefined

  return {
    ...raw,
    name,
    version,
    themeRenamed,
    author: raw.author ?? 'Shopify',
    isOS2: Boolean(raw.isOS2),
  }
}

// ─── Scrape orchestration ─────────────────────────────────────────────────────

/** Narrow shape used when mapping scrape rows into IDB. */
interface ScrapeProductJson {
  products: Array<{
    id: number
    title: string
    handle: string
    body_html: string
    vendor: string
    product_type: string
    variants: Array<{ id: number; price: string; sku: string }>
    images: Array<{ src: string }>
  }>
}

type JsonProductRow = Record<string, unknown> & { id: number }
type JsonCollectionRow = Record<string, unknown> & { id: number }

interface StorefrontProductsPageJson {
  products?: JsonProductRow[]
}

interface StorefrontCollectionsPageJson {
  collections?: JsonCollectionRow[]
}

/**
 * Paginate `{origin}/products.json?limit=250&page=N` (and collections) from the extension context.
 * Logs each page to the service worker console.
 */
async function fetchCatalogFromOrigin(origin: string): Promise<{
  productCount: number
  productsSample: CatalogProductRow[]
  collectionCount: number
  collectionsSample: CatalogCollectionRow[]
}> {
  await dbClear(STORE_PRODUCTS)
  await dbClear(STORE_COLLECTIONS)

  const productsSample: CatalogProductRow[] = []
  let productCount = 0
  let page = 1
  while (true) {
    const url = `${origin}/products.json?limit=250&page=${page}`
    console.log('[SpyKit BG] products GET', url)
    let res: Response
    try {
      res = await fetch(url, {
        credentials: 'omit',
        headers: { Accept: 'application/json' },
      })
    } catch (err) {
      console.warn('[SpyKit BG] products fetch error', url, err)
      break
    }
    if (!res.ok) {
      console.warn('[SpyKit BG] products non-OK', res.status, url)
      break
    }
    const data = (await res.json()) as StorefrontProductsPageJson
    const items = data.products ?? []
    console.log('[SpyKit BG] products page', page, 'count', items.length)
    if (!items.length) break
    await dbPutMany(STORE_PRODUCTS, items as object[])
    productsSample.push(...items)
    productCount += items.length
    page += 1
    if (items.length < 250) break
  }

  const collectionsSample: CatalogCollectionRow[] = []
  let collectionCount = 0
  let cPage = 1
  while (true) {
    const url = `${origin}/collections.json?limit=250&page=${cPage}`
    console.log('[SpyKit BG] collections GET', url)
    let res: Response
    try {
      res = await fetch(url, {
        credentials: 'omit',
        headers: { Accept: 'application/json' },
      })
    } catch (err) {
      console.warn('[SpyKit BG] collections fetch error', url, err)
      break
    }
    if (!res.ok) {
      console.warn('[SpyKit BG] collections non-OK', res.status, url)
      break
    }
    const data = (await res.json()) as StorefrontCollectionsPageJson
    const items = data.collections ?? []
    console.log('[SpyKit BG] collections page', cPage, 'count', items.length)
    if (!items.length) break
    await dbPutMany(STORE_COLLECTIONS, items as object[])
    collectionsSample.push(...items)
    collectionCount += items.length
    cPage += 1
    if (items.length < 250) break
  }

  // ── Tag each product with the collection handles it appears in ──────────────
  // Build a map from product id → array of collection handles by fetching
  // each collection's /products.json endpoint.
  const productCollectionsMap = new Map<number, string[]>()
  for (const col of collectionsSample) {
    const handle = String(col.handle ?? '')
    if (!handle) continue
    let pPage = 1
    while (true) {
      const url = `${origin}/collections/${handle}/products.json?limit=250&page=${pPage}`
      console.log('[SpyKit BG] collection products GET', url)
      let colRes: Response
      try {
        colRes = await fetch(url, { credentials: 'omit', headers: { Accept: 'application/json' } })
      } catch {
        break
      }
      if (!colRes.ok) break
      const colData = (await colRes.json()) as StorefrontProductsPageJson
      const colItems = colData.products ?? []
      if (!colItems.length) break
      for (const p of colItems) {
        const existing = productCollectionsMap.get(p.id) ?? []
        if (!existing.includes(handle)) existing.push(handle)
        productCollectionsMap.set(p.id, existing)
      }
      pPage += 1
      if (colItems.length < 250) break
    }
  }

  // Merge collection tags into products
  const taggedProducts = productsSample.map((p) => ({
    ...p,
    _collections: productCollectionsMap.get(p.id) ?? [],
  }))

  console.log('[SpyKit BG] catalog totals', { productCount, collectionCount })
  return { productCount, productsSample: taggedProducts, collectionCount, collectionsSample }
}

async function syncCatalogFromActiveTab(): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const tab = tabs[0]
  if (!tab?.url) {
    log('SYNC_CATALOG: no active tab url')
    return
  }
  let origin: string
  try {
    const u = new URL(tab.url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return
    origin = u.origin
  } catch {
    return
  }

  const domainHostname = new URL(origin).hostname
  const { storeInfo } = await storageGet(['storeInfo'])

  const loading: StoreInfo = {
    domain: storeInfo?.domain ?? domainHostname,
    theme: storeInfo?.theme ?? null,
    apps: storeInfo?.apps ?? [],
    productCount: storeInfo?.productCount ?? 0,
    collectionCount: storeInfo?.collectionCount ?? 0,
    detectedAt: Date.now(),
    catalogLoading: true,
    shopifyThemeRaw: storeInfo?.shopifyThemeRaw ?? null,
    productsSample: storeInfo?.productsSample,
    collectionsSample: storeInfo?.collectionsSample,
    catalogFullDataInIndexedDb: storeInfo?.catalogFullDataInIndexedDb,
  }
  await storageSet({ storeInfo: loading })

  try {
    const { productCount, productsSample, collectionCount, collectionsSample } =
      await fetchCatalogFromOrigin(origin)
    await storageSet({
      storeInfo: {
        ...loading,
        domain: domainHostname,
        productCount,
        collectionCount,
        productsSample,
        collectionsSample,
        catalogLoading: false,
        catalogFullDataInIndexedDb: true,
        detectedAt: Date.now(),
      },
    })
  } catch (err) {
    console.error('[SpyKit BG] syncCatalogFromActiveTab', err)
    await storageSet({
      storeInfo: {
        ...loading,
        catalogLoading: false,
        catalogFullDataInIndexedDb: false,
        detectedAt: Date.now(),
      },
    })
  }
}

async function scrapeProducts(
  domain: string,
  opts: { collectionHandle?: string; slowMode?: boolean },
) {
  const base = `https://${domain}`
  const endpoint = opts.collectionHandle
    ? `${base}/collections/${opts.collectionHandle}/products.json`
    : `${base}/products.json`

  await dbClear(STORE_PRODUCTS)

  let page = 1
  let fetched = 0
  const limit = opts.slowMode ? 10 : 250

  while (true) {
    const url = `${endpoint}?limit=${limit}&page=${page}`
    let data: ScrapeProductJson
    try {
      const res = await fetch(url)
      if (!res.ok) break
      data = (await res.json()) as ScrapeProductJson
    } catch {
      break
    }

    if (!data.products?.length) break

    await dbPutMany(
      STORE_PRODUCTS,
      data.products.map((p) => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
        vendor: p.vendor,
        type: p.product_type,
        variants: p.variants,
        images: p.images.map((i) => i.src),
      })),
    )

    fetched += data.products.length
    page++

    await sendToPopup({
      type: 'SCRAPE_PROGRESS',
      from: 'background',
      payload: { done: fetched, total: 0, phase: 'products' },
    } satisfies ExtMessage)

    if (data.products.length < limit) break
    if (opts.slowMode) await new Promise((r) => setTimeout(r, 1500))
  }

  return fetched
}

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (rawMsg: unknown, _sender, sendResponse) => {
    const msg = rawMsg as ExtMessage

    if (msg.type === 'STORE_DETECTED') {
      log('Store detected:', msg.payload.domain)
      // Lightweight — no async needed for detection signal
    }

    if (msg.type === 'PAGE_DATA') {
      const {
        domain,
        theme: themeRaw,
        apps,
        productCount: pc,
        collectionCount: cc,
        shopifyThemeRaw: rawThemeObj,
      } = msg.payload
      storageGet(['storeInfo']).then(async ({ storeInfo }) => {
        const theme = normalizeThemePayload(themeRaw)
        const cl = msg.payload.catalogLoading
        const catalogLoading =
          cl === true ? true : cl === false ? false : (storeInfo?.catalogLoading ?? false)

        let productCount = storeInfo?.productCount ?? 0
        if (typeof pc === 'number') productCount = pc

        let collectionCount = storeInfo?.collectionCount ?? 0
        if (typeof cc === 'number') collectionCount = cc

        let shopifyThemeRaw = storeInfo?.shopifyThemeRaw ?? null
        if (rawThemeObj !== undefined) shopifyThemeRaw = rawThemeObj

        const productsSample = storeInfo?.productsSample
        const collectionsSample = storeInfo?.collectionsSample

        let catalogFullDataInIndexedDb = storeInfo?.catalogFullDataInIndexedDb ?? false
        if (Array.isArray(productsSample) && productsSample.length > 0) catalogFullDataInIndexedDb = true

        const info: StoreInfo = {
          domain,
          theme,
          apps: apps as ShopifyApp[],
          productCount,
          collectionCount,
          catalogLoading,
          shopifyThemeRaw,
          productsSample,
          collectionsSample,
          catalogFullDataInIndexedDb,
          detectedAt: Date.now(),
        }
        await storageSet({ storeInfo: info })
        log('Stored page data for', domain, {
          products: info.productCount,
          collections: info.collectionCount,
          theme: theme?.name,
          catalogLoading: info.catalogLoading,
        })
      })
    }

    if (msg.type === 'GET_STORE_INFO') {
      storageGet(['storeInfo']).then(({ storeInfo }) => {
        sendResponse({
          type: 'STORE_INFO_RESPONSE',
          from: 'background',
          payload: storeInfo ?? null,
        } satisfies ExtMessage)
      })
      return true // async response
    }

    if (msg.type === 'SYNC_CATALOG_ON_POPUP') {
      void syncCatalogFromActiveTab().catch((err) => console.error('[SpyKit BG] SYNC_CATALOG', err))
    }

    if (msg.type === 'GET_IDB_CATALOG') {
      void Promise.all([dbGetAll(STORE_PRODUCTS), dbGetAll(STORE_COLLECTIONS)]).then(
        ([products, collections]) => {
          const payload = {
            products: products as Array<Record<string, unknown> & { id: number }>,
            collections: collections as Array<Record<string, unknown> & { id: number }>,
          }
          sendResponse({
            type: 'CATALOG_IDB_RESPONSE',
            from: 'background',
            payload,
          } satisfies ExtMessage)
        },
      )
      return true
    }

    if (msg.type === 'START_SCRAPE') {
      const { domain, collectionHandle, slowMode } = msg.payload
      scrapeProducts(domain, { collectionHandle, slowMode })
        .then(async (count) => {
          await storageGet(['storeInfo']).then(async ({ storeInfo }) => {
            if (storeInfo) {
              await storageSet({
                storeInfo: { ...storeInfo, productCount: count },
              })
            }
          })
          await sendToPopup({
            type: 'SCRAPE_COMPLETE',
            from: 'background',
            payload: { productCount: count },
          } satisfies ExtMessage)
        })
        .catch((err) => {
          log('Scrape error:', err)
        })
    }

    return false
  },
)

// ─── Install / update lifecycle ───────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(({ reason }) => {
  log(`onInstalled: ${reason} — v${__APP_VERSION__}`)
  if (reason === 'install') {
    storageSet({ syncCount: 100, isPro: false, theme: 'light' })
  }
})

log('Service worker started', IS_DEV ? '(dev)' : '(prod)')
