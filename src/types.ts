// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** 3 days in milliseconds — TTL for per-store cache entries */
export const CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000

// ─────────────────────────────────────────────────────────────────────────────
// Shared domain types
// ─────────────────────────────────────────────────────────────────────────────

/** Normalized from `window.Shopify.theme` + UI-only fields */
export interface ShopifyTheme {
  /** `Shopify.theme.schema_name` (e.g. "Turbo") */
  name: string
  /** `Shopify.theme.schema_version` (e.g. "4.1.2") */
  version: string
  author: string
  isOS2: boolean
  /** `Shopify.theme.name` — folder / renamed key (e.g. `gwh-turbo-dubai`) */
  themeRenamed?: string
  themeId?: number
  schemaName?: string | null
  schemaVersion?: string | null
  themeStoreId?: number | null
  role?: string | null
  /** Shopify may expose string `"null"` */
  themeHandle?: string | null
  storeCount?: number
  publishedAt?: string
  license?: string
  styles?: number
  fileSize?: string
  liquidFiles?: number
  sections?: number
  snippets?: number
  assets?: number
  templates?: number
}

export interface ShopifyApp {
  id: string
  name: string
  category: 'marketing' | 'sales' | 'reviews' | 'analytics' | 'other'
  rating?: number
  reviewCount?: number
  iconUrl?: string
  iconBg?: string
}

/** Slim preview rows for `chrome.storage` / `window.storeData` (cap ~100). Full bodies live in IndexedDB. */
export interface ProductSlim {
  id: number
  handle: string
  title: string
  product_type?: string
  vendor?: string
}

export interface CollectionSlim {
  id: number
  handle: string
  title: string
}

export type CatalogProductRow = Record<string, unknown> & { id: number }
export type CatalogCollectionRow = Record<string, unknown> & { id: number }

/**
 * Shopify storefront `GET /meta.json` (same origin as the live shop).
 * @see https://shopify.dev/docs/api/ajax/reference/meta
 */
export interface ShopMetaJson {
  id?: number
  name?: string
  city?: string
  province?: string
  country?: string
  currency?: string
  domain?: string
  url?: string
  myshopify_domain?: string
  description?: string
  ships_to_countries?: string[]
  money_format?: string
  published_collections_count?: number
  published_products_count?: number
  shopify_pay_enabled_card_brands?: string[]
  offers_shop_pay_installments?: boolean
}

/** Social links + emails scraped from the store's storefront DOM. */
export interface StoreContacts {
  /** Map of platform name → href, e.g. `{ instagram: 'https://instagram.com/...' }` */
  social: Record<string, string>
  /** Unique contact emails found in mailto links / visible text */
  emails: string[]
}

/**
 * Popup `window.storeData` — theme/meta/contacts from `chrome.storage.local` cache;
 * **`products` / `collections` are read from IndexedDB** (`spykit-db`, `by_domain`) whenever
 * `syncPopupStoreData` runs so DevTools always see the same catalog as the DB.
 */
export interface SpyKitStoreData {
  /** Exact JSON clone of `window.Shopify.theme` from the storefront (same as persisted `shopifyThemeRaw`). */
  theme: Record<string, unknown> | null
  /** `schema_name` from raw theme (convenience) */
  themeSchemaName: string
  /** `schema_version` from raw theme (convenience) */
  themeSchemaVersion: string
  /** `name` on raw theme — folder / renamed key (convenience) */
  themeRenamed: string
  /** Normalized theme for UI (`StoreInfo.theme`) */
  themeNormalized: ShopifyTheme | null
  apps: ShopifyApp[]
  domain: string
  productCount: number
  collectionCount: number
  catalogLoading: boolean
  detectedAt?: number
  /** Rows loaded from IndexedDB for the active shop domain (source of truth). */
  products: CatalogProductRow[]
  /** Rows loaded from IndexedDB for the active shop domain (source of truth). */
  collections: CatalogCollectionRow[]
  /** True when IDB has catalog rows and/or cache says a full sync completed. */
  catalogFullDataInIndexedDb: boolean
  /** Full JSON from `{origin}/meta.json` (content script). */
  shopMeta: ShopMetaJson | null
  /** Display name from `shopMeta.name` (`/meta.json`); empty until meta loads */
  storeName: string
  /** Social links + emails scraped from the store's storefront DOM by the content script. */
  storeContacts: StoreContacts | null
}

export interface StoreInfo {
  domain: string
  /** Full JSON from `{origin}/meta.json` — primary source for store display name (`name`). */
  shopMeta?: ShopMetaJson | null
  /** Merchant display name from `shopMeta.name` only (set in background). */
  storeName?: string
  theme: ShopifyTheme | null
  apps: ShopifyApp[]
  productCount: number
  collectionCount: number
  detectedAt: number
  /** unix ms of last successful cache write */
  cachedAt?: number
  /** True while page-world is paginating `/products.json` / `/collections.json` */
  catalogLoading?: boolean
  /** Raw `window.Shopify.theme` (serialized in page-world) */
  shopifyThemeRaw?: Record<string, unknown> | null
  /** Full product rows loaded from IndexedDB (populated in popup, NOT persisted to chrome.storage). */
  productsSample?: CatalogProductRow[]
  /** Full collection rows loaded from IndexedDB (populated in popup, NOT persisted to chrome.storage). */
  collectionsSample?: CatalogCollectionRow[]
  /** Full API payloads exist in IndexedDB for this domain when true. */
  catalogFullDataInIndexedDb?: boolean
  /** Social links + emails scraped from the store's storefront DOM. */
  storeContacts?: StoreContacts
}

/**
 * Lightweight store metadata persisted in `chrome.storage.local` under
 * `storeCacheByDomain[domain]`.  Products and collections are NOT stored here —
 * they live in IndexedDB, tagged with `domain` and `cachedAt`.
 */
export interface StoreCacheMeta {
  domain: string
  storeName?: string
  detectedAt: number
  cachedAt: number
  theme: ShopifyTheme | null
  shopifyThemeRaw?: Record<string, unknown> | null
  shopMeta?: ShopMetaJson | null
  storeContacts?: StoreContacts
  apps: ShopifyApp[]
  productCount: number
  collectionCount: number
  catalogLoading?: boolean
  /** True once IDB has been populated for this domain */
  catalogFullDataInIndexedDb: boolean
}

export type PopupPageId = 'store' | 'theme' | 'apps' | 'scraper' | 'downloads' | 'export'

/**
 * Single persisted blob for all popup UI preferences.
 * Bump `settingsVersion` when adding fields so migrations can normalize old storage.
 */
export interface PopupSettings {
  settingsVersion: number
  theme: 'light' | 'dark'
  activeTab: PopupPageId
  scrollY: number
  scraperView: 'products' | 'collections'
  scraperPage: number
  scraperSearch: string
  scraperStockFilter: 'all' | 'in' | 'out'
  scraperVendorFilters: string[]
  scraperTypeFilters: string[]
  scraperCatalogFilters: string[]
  scraperPerPage: 10 | 25 | 50
}

/** @deprecated Legacy shape — read only for migration into `popupSettings`. */
export interface PopupViewState {
  activePage: PopupPageId
  scraperView?: 'products' | 'collections'
  scraperPage?: number
  scraperSearch?: string
  scraperStockFilter?: 'all' | 'in' | 'out'
  scraperVendorFilters?: string[]
  scraperTypeFilters?: string[]
  scraperCatalogFilters?: string[]
  scraperPerPage?: 10 | 25 | 50
  scrollY?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-context message union  (content ↔ background ↔ popup)
// Add discriminated union members for every new message type.
// ─────────────────────────────────────────────────────────────────────────────

export type MessageFrom = 'content' | 'background' | 'popup' | 'injected'

// ── Content → Background ─────────────────────────────────────────────────────
export interface MsgStoreDetected {
  type: 'STORE_DETECTED'
  from: 'content'
  payload: { domain: string; tabId: number }
}

export interface MsgPageData {
  type: 'PAGE_DATA'
  from: 'injected' | 'content'
  payload: {
    domain: string
    theme: Partial<ShopifyTheme>
    apps: ShopifyApp[]
    /** Total from paginated `/products.json` in page context */
    productCount?: number
    /** Total from paginated `/collections.json` in page context */
    collectionCount?: number
    /** When true, popup should show skeletons for catalog counts */
    catalogLoading?: boolean
    shopifyThemeRaw?: Record<string, unknown> | null
    productsSample?: ProductSlim[]
    collectionsSample?: CollectionSlim[]
  }
}

/** Content script fetched `{origin}/meta.json` (Shopify shop object). */
export interface MsgShopMeta {
  type: 'SHOP_META'
  from: 'content'
  payload: {
    domain: string
    shopMeta: ShopMetaJson
  }
}

/** Content script collected social links + emails from the storefront DOM. */
export interface MsgStoreContacts {
  type: 'STORE_CONTACTS'
  from: 'content'
  payload: {
    domain: string
    contacts: StoreContacts
  }
}

// ── Popup → Background ───────────────────────────────────────────────────────
export interface MsgGetStoreInfo {
  type: 'GET_STORE_INFO'
  from: 'popup'
  /** Canonical shop domain (e.g. `aedev.myshopify.com`) for the active tab. */
  payload?: { host?: string }
}

/** Popup opened — fetch `/products.json` + `/collections.json` from the active tab’s `location.origin`. */
export interface MsgSyncCatalogOnPopup {
  type: 'SYNC_CATALOG_ON_POPUP'
  from: 'popup'
}

/** Load full product/collection objects written during catalog sync (IndexedDB). */
export interface MsgGetIdbCatalog {
  type: 'GET_IDB_CATALOG'
  from: 'popup'
}

export interface MsgStartScrape {
  type: 'START_SCRAPE'
  from: 'popup'
  payload: { domain: string; collectionHandle?: string; slowMode?: boolean }
}

export interface MsgExport {
  type: 'EXPORT'
  from: 'popup'
  payload: { format: 'csv' | 'xlsx' | 'json' }
}

// ── Background → Popup ───────────────────────────────────────────────────────
export interface MsgStoreInfoResponse {
  type: 'STORE_INFO_RESPONSE'
  from: 'background'
  payload: StoreInfo | null
}

export interface MsgScrapeProgress {
  type: 'SCRAPE_PROGRESS'
  from: 'background'
  payload: { done: number; total: number; phase: string }
}

export interface MsgScrapeComplete {
  type: 'SCRAPE_COMPLETE'
  from: 'background'
  payload: { productCount: number }
}

export interface MsgError {
  type: 'ERROR'
  from: MessageFrom
  payload: { message: string; code?: string }
}

export interface MsgCatalogIdbResponse {
  type: 'CATALOG_IDB_RESPONSE'
  from: 'background'
  payload: {
    products: CatalogProductRow[]
    collections: CatalogCollectionRow[]
  }
}

/** Ephemeral UI hint — relayed to the popup when it is open (content → background → popup). */
export interface MsgSpykitToast {
  type: 'SPYKIT_TOAST'
  from: 'content' | 'background'
  payload: { message: string }
}

// ── Union ────────────────────────────────────────────────────────────────────
export type ExtMessage =
  | MsgStoreDetected
  | MsgPageData
  | MsgShopMeta
  | MsgStoreContacts
  | MsgGetStoreInfo
  | MsgSyncCatalogOnPopup
  | MsgGetIdbCatalog
  | MsgStartScrape
  | MsgExport
  | MsgStoreInfoResponse
  | MsgScrapeProgress
  | MsgScrapeComplete
  | MsgError
  | MsgCatalogIdbResponse
  | MsgSpykitToast

// ─────────────────────────────────────────────────────────────────────────────
// Storage schema (chrome.storage.local keys)
// ─────────────────────────────────────────────────────────────────────────────
export interface StorageSchema {
  /** @deprecated Legacy single-store slot — kept for one-time migration only. */
  storeInfo: StoreInfo | null
  /** @deprecated Replaced by storeCacheByDomain — kept for one-time migration. */
  storeInfoByHost: Record<string, StoreInfo> | null
  /**
   * Per-store lightweight metadata keyed by canonical shop domain
   * (e.g. `"aedev.myshopify.com"`).  Products / collections are NOT here —
   * they live in IndexedDB tagged with the same domain key.
   */
  storeCacheByDomain: Record<string, StoreCacheMeta> | null
  /** UI theme — mirrored from `popupSettings.theme` for background / older code paths */
  theme: 'light' | 'dark'
  syncCount: number
  isPro: boolean
  lastSyncAt: number | null
  /** All popup UI state (tabs, products tab, scroll, theme mirror) */
  popupSettings: PopupSettings | null
  /**
   * Ephemeral toast ping (service worker / content → popup). `at` must change
   * on every toast so `storage.onChanged` fires reliably.
   */
  spykitToast?: { message: string; at: number } | null
}
