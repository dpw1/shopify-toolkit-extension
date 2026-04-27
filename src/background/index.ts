/**
 * Background service worker (ES module).
 *
 * Storage architecture:
 *  - chrome.storage.local["storeCacheByDomain"][domain] → StoreCacheMeta (lightweight, no arrays)
 *  - IndexedDB "products"    → records tagged with {domain, cachedAt}, queryable by by_domain index
 *  - IndexedDB "collections" → same
 *
 * This prevents chrome.storage.local bloat from large product arrays and keeps
 * per-store data fully isolated, even across multiple open Shopify tabs.
 */

import type {
  CatalogCollectionRow,
  CatalogProductRow,
  ExtMessage,
  PopupSettings,
  ShopifyApp,
  ShopifyTheme,
  StoreCacheMeta,
  StoreInfo,
} from '../types'
import { CACHE_TTL_MS } from '../types'
import { resolveShopDomainInPage } from '../lib/injected/resolveShopDomain'
import { normalizeStoreDomainKey } from '../lib/storeDomain'
import { storageGet, storageSet } from '../lib/storage'
import {
  dbPutManyTagged,
  dbDeleteByDomain,
  STORE_PRODUCTS,
  STORE_COLLECTIONS,
} from '../lib/db'

declare const __APP_MODE__: string
declare const __APP_VERSION__: string

const IS_DEV = __APP_MODE__ === 'development'

/** One catalog sync per domain at a time (popup may send SYNC twice in quick succession). */
const catalogSyncInFlightByDomain = new Map<string, Promise<void>>()

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

function toastPopup(message: string) {
  // `chrome.runtime.sendMessage` from the service worker often does not reach an
  // open popup. Storage `onChanged` is reliable for cross-context UI toasts.
  void storageSet({ spykitToast: { message, at: Date.now() } })
}

function isNoReceiverError(err: unknown): boolean {
  return String(err).toLowerCase().includes('receiving end does not exist')
}

async function sendToTabWithRetry(tabId: number, message: ExtMessage): Promise<unknown> {
  try {
    return await chrome.tabs.sendMessage(tabId, message)
  } catch (e) {
    if (!isNoReceiverError(e)) throw e
    // Content script can be missing briefly on freshly loaded tabs.
    await new Promise((r) => setTimeout(r, 450))
    return await chrome.tabs.sendMessage(tabId, message)
  }
}

/** Turn injected-script partial theme into persisted `ShopifyTheme`. */
function normalizeThemePayload(raw: Partial<ShopifyTheme> | undefined): ShopifyTheme | null {
  if (!raw || Object.keys(raw).length === 0) return null

  const name =
    raw.schemaName != null && String(raw.schemaName).trim()
      ? String(raw.schemaName).trim()
      : 'Unknown'

  const version =
    raw.schemaVersion != null && String(raw.schemaVersion).trim()
      ? String(raw.schemaVersion).trim()
      : ''

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

/** Merge theme (+ optional apps) into `storeCacheByDomain` — shared by `PAGE_DATA` and popup MAIN-world inject. */
async function persistStoreThemeFromPagePayload(
  domain: string,
  themeRaw: Partial<ShopifyTheme> | undefined,
  rawThemeObj: Record<string, unknown> | null | undefined,
  apps: ShopifyApp[] | undefined,
  appDetectionResult: Record<string, unknown> | null | undefined,
): Promise<void> {
  const key = normalizeStoreDomainKey(domain)
  const map = await loadCacheMap()
  const existing = map[key] ?? null

  const theme = normalizeThemePayload(themeRaw)
  const shopifyThemeRaw = rawThemeObj !== undefined ? rawThemeObj : (existing?.shopifyThemeRaw ?? null)
  const nameFromShopMeta =
    existing?.shopMeta && typeof existing.shopMeta.name === 'string'
      ? existing.shopMeta.name.trim()
      : ''

  const patch: Partial<StoreCacheMeta> = {
    domain: key,
    theme,
    shopifyThemeRaw,
    storeName: nameFromShopMeta || existing?.storeName,
    detectedAt: Date.now(),
    cachedAt: existing?.cachedAt ?? Date.now(),
  }
  if (apps !== undefined) {
    patch.apps = apps
  }
  if (appDetectionResult !== undefined) {
    patch.appDetectionResult = appDetectionResult
  }

  await saveCacheMeta(domain, patch, existing)
}

// ─── Per-store cache helpers ──────────────────────────────────────────────────

/**
 * Build a `StoreCacheMeta` from a legacy `StoreInfo` (migration helper).
 * Products / collections are intentionally dropped — they now live in IDB.
 */
function storeInfoToMeta(info: StoreInfo, key: string): StoreCacheMeta {
  const appsFromDetection = Object.values(
    ((info.appDetectionResult as { apps?: Record<string, unknown> } | null)?.apps ?? {}) as Record<
      string,
      unknown
    >,
  ) as ShopifyApp[]
  return {
    domain: info.domain || key,
    storeName: info.storeName,
    detectedAt: info.detectedAt || Date.now(),
    cachedAt: info.cachedAt ?? Date.now(),
    theme: info.theme,
    shopifyThemeRaw: info.shopifyThemeRaw,
    shopMeta: info.shopMeta,
    storeContacts: info.storeContacts,
    apps: appsFromDetection,
    appDetectionResult: info.appDetectionResult ?? null,
    productCount: info.productCount ?? 0,
    collectionCount: info.collectionCount ?? 0,
    catalogLoading: info.catalogLoading,
    catalogLinkingCollections: info.catalogLinkingCollections,
    catalogFullDataInIndexedDb: info.catalogFullDataInIndexedDb ?? false,
    shopMetaSourceFetchedAt: info.shopMetaSourceFetchedAt,
    catalogSourceFetchedAt: info.catalogSourceFetchedAt,
  }
}

/** Convert a `StoreCacheMeta` into the `StoreInfo` shape the popup expects. */
function metaToStoreInfo(meta: StoreCacheMeta): StoreInfo {
  return {
    domain: meta.domain,
    storeName: meta.storeName,
    theme: meta.theme,
    shopifyThemeRaw: meta.shopifyThemeRaw,
    shopMeta: meta.shopMeta,
    storeContacts: meta.storeContacts,
    appDetectionResult: meta.appDetectionResult ?? null,
    productCount: meta.productCount,
    collectionCount: meta.collectionCount,
    detectedAt: meta.detectedAt,
    cachedAt: meta.cachedAt,
    catalogLoading: meta.catalogLoading,
    catalogLinkingCollections: meta.catalogLinkingCollections,
    catalogFullDataInIndexedDb: meta.catalogFullDataInIndexedDb,
    shopMetaSourceFetchedAt: meta.shopMetaSourceFetchedAt,
    catalogSourceFetchedAt: meta.catalogSourceFetchedAt,
    // productsSample / collectionsSample intentionally omitted — popup reads IDB directly
  }
}

/**
 * Load the full `storeCacheByDomain` map, migrating legacy storage shapes on
 * the first call so old installs see their data without re-scraping.
 */
async function loadCacheMap(): Promise<Record<string, StoreCacheMeta>> {
  const { storeCacheByDomain, storeInfoByHost, storeInfo } = await storageGet([
    'storeCacheByDomain',
    'storeInfoByHost',
    'storeInfo',
  ])

  if (storeCacheByDomain) return { ...storeCacheByDomain }

  // Migrate from storeInfoByHost (previous session's schema)
  if (storeInfoByHost && Object.keys(storeInfoByHost).length > 0) {
    const migrated: Record<string, StoreCacheMeta> = {}
    for (const [key, info] of Object.entries(storeInfoByHost)) {
      migrated[key] = storeInfoToMeta(info, key)
    }
    await storageSet({ storeCacheByDomain: migrated })
    return migrated
  }

  // Migrate from legacy single-slot storeInfo
  if (storeInfo) {
    const key = normalizeStoreDomainKey(storeInfo.domain)
    const migrated: Record<string, StoreCacheMeta> = {
      [key]: storeInfoToMeta(storeInfo, key),
    }
    await storageSet({ storeCacheByDomain: migrated })
    return migrated
  }

  return {}
}

/**
 * Find cached store metadata when the popup's host hint does not match the
 * map key (e.g. `www.shop.com` vs `shop.myshopify.com`).
 */
function findCacheMetaByHostHint(
  map: Record<string, StoreCacheMeta>,
  hint: string,
): StoreCacheMeta | null {
  const k = normalizeStoreDomainKey(hint)
  const direct = map[k]
  if (direct) return direct

  for (const meta of Object.values(map)) {
    const canon = normalizeStoreDomainKey(meta.domain)
    if (canon === k) return meta

    const my = meta.shopMeta?.myshopify_domain
    if (my && normalizeStoreDomainKey(my) === k) return meta

    const shopDom = meta.shopMeta?.domain
    if (shopDom && normalizeStoreDomainKey(shopDom) === k) return meta

    const urlStr = meta.shopMeta?.url
    if (urlStr) {
      try {
        const uh = normalizeStoreDomainKey(new URL(urlStr).hostname)
        if (uh === k) return meta
      } catch {
        /* ignore bad URL */
      }
    }
  }

  return null
}

/** Merge updated fields into a domain's cache entry and persist. */
async function saveCacheMeta(
  domain: string,
  update: Partial<StoreCacheMeta>,
  base?: StoreCacheMeta | null,
): Promise<void> {
  const key = normalizeStoreDomainKey(domain)
  const map = await loadCacheMap()
  const existing = base ?? map[key]

  // Use Object.assign to avoid TS2783 "duplicate keys" on spread-then-override pattern
  const defaults: StoreCacheMeta = {
    domain: key,
    detectedAt: Date.now(),
    cachedAt: Date.now(),
    theme: null,
    apps: [],
    productCount: 0,
    collectionCount: 0,
    catalogFullDataInIndexedDb: false,
  }
  map[key] = Object.assign({}, defaults, existing ?? {}, update) as StoreCacheMeta
  await storageSet({ storeCacheByDomain: map })
}

/**
 * Remove cache entries older than `CACHE_TTL_MS` from both
 * chrome.storage.local and IndexedDB.  Runs cheaply on SW startup.
 */
async function clearExpiredStores(): Promise<void> {
  const { storeCacheByDomain } = await storageGet(['storeCacheByDomain'])
  if (!storeCacheByDomain) return

  const now = Date.now()
  const fresh: Record<string, StoreCacheMeta> = {}
  const expiredDomains: string[] = []

  for (const [key, meta] of Object.entries(storeCacheByDomain)) {
    if (now - (meta.cachedAt ?? 0) > CACHE_TTL_MS) {
      expiredDomains.push(meta.domain ?? key)
    } else {
      fresh[key] = meta
    }
  }

  if (expiredDomains.length > 0) {
    await storageSet({ storeCacheByDomain: fresh })
    for (const d of expiredDomains) {
      try {
        await dbDeleteByDomain(STORE_PRODUCTS, d)
        await dbDeleteByDomain(STORE_COLLECTIONS, d)
      } catch {
        // Non-fatal — IDB may not have records for this domain
      }
    }
    log('Purged expired stores:', expiredDomains)
  }
}

/**
 * Resolve the canonical shop domain for a tab (same logic as the popup loader).
 */
async function getCanonicalDomainFromTab(tab: chrome.tabs.Tab): Promise<string | null> {
  if (!tab.url) return null
  let urlHostname: string
  try {
    const u = new URL(tab.url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    urlHostname = normalizeStoreDomainKey(u.hostname)
  } catch {
    return null
  }

  if (!tab.id) return urlHostname

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: resolveShopDomainInPage,
    })
    const v = results[0]?.result
    if (typeof v === 'string' && v.trim()) return normalizeStoreDomainKey(v)
  } catch {
    // Tab may not be injectable (chrome:// pages, etc.)
  }

  return urlHostname
}

/**
 * Active tab in the last focused **normal** browser window. The extension popup is its own
 * window; `chrome.tabs.query({ lastFocusedWindow: true })` often targets the popup and yields
 * `no_active_tab` for storefront actions.
 */
async function getNormalWindowActiveTab(): Promise<chrome.tabs.Tab | null> {
  try {
    const w = await chrome.windows.getLastFocused({ populate: true, windowTypes: ['normal'] })
    const t = w.tabs?.find((x) => x.active)
    if (t?.id && t.url) {
      try {
        const u = new URL(t.url)
        if (u.protocol === 'http:' || u.protocol === 'https:') return t
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* getLastFocused may fail in edge contexts */
  }
  const fallback = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  return fallback[0] ?? null
}

// ─── Catalog fetching ─────────────────────────────────────────────────────────

interface StorefrontProductsPageJson {
  products?: Array<Record<string, unknown> & { id: number }>
}
interface StorefrontCollectionsPageJson {
  collections?: Array<Record<string, unknown> & { id: number }>
}

async function fetchCatalogProductsPages(origin: string): Promise<CatalogProductRow[]> {
  toastPopup('Fetching products.json…')
  const products: CatalogProductRow[] = []
  let page = 1
  while (true) {
    const url = `${origin}/products.json?limit=250&page=${page}`
    console.log('[SpyKit BG] products GET', url)
    let res: Response
    try {
      res = await fetch(url, { credentials: 'omit', headers: { Accept: 'application/json' } })
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
    if (!items.length) break
    products.push(...items)
    page++
    if (items.length < 250) break
  }
  return products
}

async function fetchCatalogCollectionsPages(origin: string): Promise<CatalogCollectionRow[]> {
  toastPopup('Fetching collections…')
  const collections: CatalogCollectionRow[] = []
  let cPage = 1
  while (true) {
    const url = `${origin}/collections.json?limit=250&page=${cPage}`
    console.log('[SpyKit BG] collections GET', url)
    let res: Response
    try {
      res = await fetch(url, { credentials: 'omit', headers: { Accept: 'application/json' } })
    } catch (err) {
      console.warn('[SpyKit BG] collections fetch error', url, err)
      break
    }
    if (!res.ok) break
    const data = (await res.json()) as StorefrontCollectionsPageJson
    const items = data.collections ?? []
    if (!items.length) break
    collections.push(...items)
    cPage++
    if (items.length < 250) break
  }
  return collections
}

/** Per-product collection handles from each collection's `products.json` pagination. */
async function buildProductCollectionHandlesMap(
  origin: string,
  collections: CatalogCollectionRow[],
): Promise<Map<number, string[]>> {
  toastPopup('Linking products to collections…')
  const productCollectionsMap = new Map<number, string[]>()
  for (const col of collections) {
    const handle = String(col.handle ?? '')
    if (!handle) continue
    const productsCount = Number((col as { products_count?: unknown }).products_count ?? 0)
    if (!Number.isFinite(productsCount) || productsCount < 1) continue
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
        const cur = productCollectionsMap.get(p.id) ?? []
        if (!cur.includes(handle)) cur.push(handle)
        productCollectionsMap.set(p.id, cur)
      }
      pPage++
      if (colItems.length < 250) break
    }
  }
  return productCollectionsMap
}

async function syncCatalogFromActiveTab(includeCollectionProducts = false): Promise<void> {
  const tab = await getNormalWindowActiveTab()
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

  const domain = await getCanonicalDomainFromTab(tab)
  if (!domain) return

  const key = normalizeStoreDomainKey(domain)
  const inFlight = catalogSyncInFlightByDomain.get(key)
  if (inFlight) {
    log('SYNC_CATALOG: join in-flight sync for', key)
    await inFlight
    return
  }

  const work = (async () => {
    let map = await loadCacheMap()
    let existing = map[key] ?? null

    await saveCacheMeta(domain, { catalogLoading: true, catalogLinkingCollections: false }, existing)

    try {
      const products = await fetchCatalogProductsPages(origin)
      const collections = await fetchCatalogCollectionsPages(origin)

      const partialFetchedAt = Date.now()
      const productsWithoutLinks = products.map((p) => ({
        ...p,
        _collections: [] as string[],
      }))
      await dbPutManyTagged(STORE_PRODUCTS, productsWithoutLinks, domain, partialFetchedAt)
      await dbPutManyTagged(STORE_COLLECTIONS, collections, domain, partialFetchedAt)

      map = await loadCacheMap()
      existing = map[key] ?? null
      if (!includeCollectionProducts) {
        await saveCacheMeta(
          domain,
          {
            productCount: products.length,
            collectionCount: collections.length,
            catalogLoading: false,
            catalogLinkingCollections: false,
            catalogFullDataInIndexedDb: true,
            catalogSourceFetchedAt: partialFetchedAt,
            cachedAt: partialFetchedAt,
          },
          existing,
        )
        log('syncCatalog done (without collection-product linking)', {
          domain,
          productCount: products.length,
          collectionCount: collections.length,
        })
        toastPopup('Catalog sync complete')
        return
      }

      await saveCacheMeta(
        domain,
        {
          productCount: products.length,
          collectionCount: collections.length,
          catalogLoading: false,
          catalogLinkingCollections: true,
          catalogFullDataInIndexedDb: false,
          catalogSourceFetchedAt: partialFetchedAt,
        },
        existing,
      )

      const handleMap = await buildProductCollectionHandlesMap(origin, collections)
      const taggedProducts = products.map((p) => ({
        ...p,
        _collections: handleMap.get(p.id) ?? [],
      }))

      const finalFetchedAt = Date.now()
      await dbPutManyTagged(STORE_PRODUCTS, taggedProducts, domain, finalFetchedAt)

      map = await loadCacheMap()
      existing = map[key] ?? null
      await saveCacheMeta(
        domain,
        {
          productCount: taggedProducts.length,
          collectionCount: collections.length,
          catalogLoading: false,
          catalogLinkingCollections: false,
          catalogFullDataInIndexedDb: true,
          catalogSourceFetchedAt: finalFetchedAt,
          cachedAt: finalFetchedAt,
        },
        existing,
      )
      log('syncCatalog done', { domain, productCount: taggedProducts.length, collectionCount: collections.length })
      toastPopup('Catalog sync complete')
    } catch (err) {
      console.error('[SpyKit BG] syncCatalogFromActiveTab', err)
      map = await loadCacheMap()
      existing = map[key] ?? null
      await saveCacheMeta(
        domain,
        { catalogLoading: false, catalogLinkingCollections: false },
        existing,
      )
      toastPopup('Catalog sync failed')
    }
  })()

  catalogSyncInFlightByDomain.set(key, work)
  try {
    await work
  } finally {
    catalogSyncInFlightByDomain.delete(key)
  }
}

// ─── Manual scrape (START_SCRAPE) ─────────────────────────────────────────────

interface ScrapeProductJson {
  products: Array<{
    id: number
    title: string
    handle: string
    vendor: string
    product_type: string
    variants: Array<{ id: number; price: string; sku: string }>
    images: Array<{ src: string }>
  }>
}

async function scrapeProducts(
  domain: string,
  opts: { collectionHandle?: string; slowMode?: boolean },
) {
  toastPopup(opts.collectionHandle ? 'Scraping collection products…' : 'Scraping products…')

  const base = `https://${domain}`
  const endpoint = opts.collectionHandle
    ? `${base}/collections/${opts.collectionHandle}/products.json`
    : `${base}/products.json`

  const limit = opts.slowMode ? 10 : 250
  let page = 1
  let fetched = 0
  const allRows: Array<Record<string, unknown> & { id: number }> = []

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

    const rows = data.products.map((p) => ({
      id: p.id,
      title: p.title,
      handle: p.handle,
      vendor: p.vendor,
      type: p.product_type,
      variants: p.variants,
      images: p.images.map((i) => i.src),
    }))
    allRows.push(...rows)
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

  // Persist to IDB with domain tag
  if (allRows.length > 0) {
    await dbPutManyTagged(STORE_PRODUCTS, allRows, domain, Date.now())
  }

  return fetched
}

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((rawMsg: unknown, _sender, sendResponse) => {
  const msg = rawMsg as ExtMessage

  if (msg.type === 'SPYKIT_TOAST' && msg.from === 'content') {
    void storageSet({
      spykitToast: { message: msg.payload.message, at: Date.now() },
    })
    return false
  }

  if (msg.type === 'STORE_DETECTED') {
    log('Store detected:', msg.payload.domain)
  }

  if (msg.type === 'PAGE_DATA') {
    const {
      domain,
      theme: themeRaw,
      apps,
      shopifyThemeRaw: rawThemeObj,
      standaloneResult: appDetectionResult,
    } = msg.payload
    void (async () => {
      await persistStoreThemeFromPagePayload(domain, themeRaw, rawThemeObj, apps, appDetectionResult)
      log('Stored PAGE_DATA for', normalizeStoreDomainKey(domain), {
        theme: normalizeThemePayload(themeRaw)?.name,
      })
    })()
  }

  if (msg.type === 'SPYKIT_THEME_FROM_MAIN_WORLD' && msg.from === 'popup') {
    const { domain, theme, shopifyThemeRaw } = msg.payload
    void (async () => {
      try {
        await persistStoreThemeFromPagePayload(domain, theme, shopifyThemeRaw, undefined, undefined)
        log('Stored theme (MAIN inject) for', normalizeStoreDomainKey(domain))
        sendResponse({ ok: true })
      } catch (e) {
        sendResponse({ ok: false, error: String(e) })
      }
    })()
    return true
  }

  if (msg.type === 'SPYKIT_STORE_SNAPSHOT_FROM_POPUP' && msg.from === 'popup') {
    const { domain, theme, shopifyThemeRaw, apps, appDetectionResult } = msg.payload
    void (async () => {
      try {
        await persistStoreThemeFromPagePayload(domain, theme, shopifyThemeRaw, apps, appDetectionResult)
        log('Stored snapshot (popup-detected) for', normalizeStoreDomainKey(domain), {
          theme: theme?.name,
          apps: apps.length,
        })
        sendResponse({ ok: true })
      } catch (e) {
        sendResponse({ ok: false, error: String(e) })
      }
    })()
    return true
  }

  if (msg.type === 'SHOP_META') {
    const { domain, shopMeta } = msg.payload
    void (async () => {
      const key = normalizeStoreDomainKey(domain)
      const map = await loadCacheMap()
      const existing = map[key] ?? null
      const nameFromJson =
        shopMeta && typeof shopMeta.name === 'string' ? shopMeta.name.trim() : ''

      const fetchedAt = Date.now()
      await saveCacheMeta(
        domain,
        {
          shopMeta,
          storeName: nameFromJson || existing?.storeName,
          cachedAt: existing?.cachedAt ?? Date.now(),
          shopMetaSourceFetchedAt: fetchedAt,
        },
        existing,
      )
      log('Stored SHOP_META for', key, { name: nameFromJson })
    })()
  }

  if (msg.type === 'STORE_CONTACTS') {
    const { domain, contacts } = msg.payload
    void (async () => {
      const key = normalizeStoreDomainKey(domain)
      const map = await loadCacheMap()
      const existing = map[key] ?? null
      await saveCacheMeta(
        domain,
        { storeContacts: contacts, cachedAt: existing?.cachedAt ?? Date.now() },
        existing,
      )
      log('Stored STORE_CONTACTS for', key, {
        emails: contacts.emails.length,
        socials: Object.keys(contacts.social).length,
      })
    })()
  }

  if (msg.type === 'APPS_DETECTED') {
    const { domain, apps } = msg.payload
    void (async () => {
      const key = normalizeStoreDomainKey(domain)
      const map = await loadCacheMap()
      const existing = map[key] ?? null
      await saveCacheMeta(
        domain,
        { apps: apps as ShopifyApp[], cachedAt: existing?.cachedAt ?? Date.now() },
        existing,
      )
      log('Stored APPS_DETECTED for', key, { apps: apps.length })
    })()
  }

  if (msg.type === 'GET_STORE_INFO') {
    const requestedHost = msg.payload?.host
    void (async () => {
      if (!requestedHost) {
        sendResponse({ type: 'STORE_INFO_RESPONSE', from: 'background', payload: null } satisfies ExtMessage)
        return
      }
      const map = await loadCacheMap()
      const meta = findCacheMetaByHostHint(map, requestedHost)
      sendResponse({
        type: 'STORE_INFO_RESPONSE',
        from: 'background',
        payload: meta ? metaToStoreInfo(meta) : null,
      } satisfies ExtMessage)
    })()
    return true // async response
  }

  if (msg.type === 'SYNC_CATALOG_ON_POPUP') {
    void syncCatalogFromActiveTab(false).catch((err) => console.error('[SpyKit BG] SYNC_CATALOG', err))
  }

  if (msg.type === 'SPYKIT_DEBUG_LINK_COLLECTION_PRODUCTS' && msg.from === 'popup') {
    void (async () => {
      try {
        await syncCatalogFromActiveTab(true)
        sendResponse({ ok: true })
      } catch (e) {
        sendResponse({ ok: false, error: String(e) })
      }
    })()
    return true
  }

  if (msg.type === 'SPYKIT_RUN_SHOP_SCAN' && msg.from === 'popup') {
    void (async () => {
      try {
        const requestedTabId = msg.payload?.tabId
        const tab =
          typeof requestedTabId === 'number'
            ? await chrome.tabs.get(requestedTabId).catch(() => undefined)
            : await getNormalWindowActiveTab()
        if (!tab?.id) {
          sendResponse({ ok: false, error: 'no_active_tab' })
          return
        }
        const response = await sendToTabWithRetry(tab.id, {
          type: 'SPYKIT_RUN_SHOP_SCAN',
          from: 'background',
        } satisfies ExtMessage)
        sendResponse(response ?? { ok: true })
      } catch (e) {
        sendResponse({ ok: false, error: String(e) })
      }
    })()
    return true
  }

  if (msg.type === 'SPYKIT_DEBUG_HEAD_HTML' && msg.from === 'popup') {
    void (async () => {
      try {
        const requestedTabId = msg.payload?.tabId
        const tab =
          typeof requestedTabId === 'number'
            ? await chrome.tabs.get(requestedTabId).catch(() => undefined)
            : await getNormalWindowActiveTab()
        if (!tab?.id) {
          sendResponse({ ok: false, error: 'no_active_tab' })
          return
        }
        const response = await sendToTabWithRetry(tab.id, {
          type: 'SPYKIT_DEBUG_HEAD_HTML',
          from: 'background',
        } satisfies ExtMessage)
        sendResponse(response ?? { ok: false, error: 'no_response' })
      } catch (e) {
        sendResponse({ ok: false, error: String(e) })
      }
    })()
    return true
  }

  if (msg.type === 'FORCE_REFRESH_STORE' && msg.from === 'popup') {
    void (async () => {
      try {
        const tab = await getNormalWindowActiveTab()
        if (!tab?.id) {
          sendResponse({ ok: false, error: 'no_active_tab' })
          return
        }
        const domain = await getCanonicalDomainFromTab(tab)
        if (!domain) {
          sendResponse({ ok: false, error: 'no_domain' })
          return
        }
        const key = normalizeStoreDomainKey(domain)
        try {
          await dbDeleteByDomain(STORE_PRODUCTS, key)
          await dbDeleteByDomain(STORE_COLLECTIONS, key)
        } catch (e) {
          log('FORCE_REFRESH IDB purge', e)
        }
        const map = await loadCacheMap()
        delete map[key]
        await storageSet({ storeCacheByDomain: map })
        toastPopup(`Cleared cache for ${key} — re-fetching…`)
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'SPYKIT_FORCE_REFRESH' })
        } catch {
          /* tab may not have our content script (non-store URL) */
        }
        // Catalog sync: popup calls `spykitLoadStore` → `fetchAllData` → `SYNC_CATALOG_ON_POPUP`
        // once. Avoid running `syncCatalogFromActiveTab` here too (duplicate fetches / logs).
        sendResponse({ ok: true })
      } catch (e) {
        sendResponse({ ok: false, error: String(e) })
      }
    })()
    return true
  }

  if (msg.type === 'START_SCRAPE') {
    const { domain, collectionHandle, slowMode } = msg.payload
    scrapeProducts(domain, { collectionHandle, slowMode })
      .then(async (count) => {
        await saveCacheMeta(domain, { productCount: count })
        await sendToPopup({
          type: 'SCRAPE_COMPLETE',
          from: 'background',
          payload: { productCount: count },
        } satisfies ExtMessage)
      })
      .catch((err) => log('Scrape error:', err))
  }

  return false
})

// ─── Install / startup lifecycle ──────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(({ reason }) => {
  log(`onInstalled: ${reason} — v${__APP_VERSION__}`)
  if (reason === 'install') {
    const defaultPopupSettings: PopupSettings = {
      settingsVersion: 1,
      theme: 'light',
      activeTab: 'store',
      scrollY: 0,
      appsExpandedAppKey: '',
      appsScrollY: 0,
      scraperView: 'products',
      scraperPage: 1,
      scraperSearch: '',
      scraperStockFilter: 'all',
      scraperVendorFilters: [],
      scraperTypeFilters: [],
      scraperCatalogFilters: [],
      scraperPerPage: 10,
    }
    void storageGet(['popupSettings']).then(({ popupSettings }) => {
      void storageSet({
        syncCount: 100,
        isPro: false,
        theme: 'light',
        popupSettings: popupSettings ?? defaultPopupSettings,
      })
    })
  }
})

// Clear stale per-store cache on every SW startup
void clearExpiredStores().catch(() => undefined)

log('Service worker started', IS_DEV ? '(dev)' : '(prod)')
