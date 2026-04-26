import { dbGetByDomain, STORE_COLLECTIONS, STORE_PRODUCTS } from '../lib/db'
import { normalizeStoreDomainKey } from '../lib/storeDomain'
import type {
  CatalogCollectionRow,
  CatalogProductRow,
  SpyKitStoreData,
  StoreInfo,
} from '../types'

function str(v: unknown): string {
  if (v == null) return ''
  const s = String(v).trim()
  return s
}

/**
 * Expose the latest store snapshot on `window` for DevTools / debugging.
 *
 * **Catalog source of truth:** `products` / `collections` are always read from
 * **IndexedDB** (`spykit-db`, keyed by `storeInfo.domain`). `chrome.storage.local`
 * only holds `storeCacheByDomain` metadata — it does not contain product rows.
 * `storeInfo.productsSample` is a React convenience copy from the same IDB read
 * in `loadPopupStoreBundle`; `window.storeData` is refreshed from IDB here so it
 * cannot drift from the database.
 */
export async function syncPopupStoreData(storeInfo: StoreInfo | null): Promise<void> {
  const raw = storeInfo?.shopifyThemeRaw ?? null
  const tn = storeInfo?.theme ?? null

  if (!storeInfo) {
    window.storeData = {
      theme: null,
      themeSchemaName: '',
      themeSchemaVersion: '',
      themeRenamed: '',
      themeNormalized: null,
      apps: [],
      domain: '',
      shopMeta: null,
      storeName: '',
      productCount: 0,
      collectionCount: 0,
      catalogLoading: false,
    catalogLinkingCollections: false,
      products: [],
      collections: [],
      catalogFullDataInIndexedDb: false,
      storeContacts: null,
    }
    return
  }

  const domainKey = normalizeStoreDomainKey(storeInfo.domain)
  const [idbProducts, idbCollections] = await Promise.all([
    dbGetByDomain<CatalogProductRow>(STORE_PRODUCTS, domainKey),
    dbGetByDomain<CatalogCollectionRow>(STORE_COLLECTIONS, domainKey),
  ])

  const products = idbProducts
  const collections = idbCollections
  const catalogFull =
    (storeInfo.catalogFullDataInIndexedDb ?? false) || products.length > 0 || collections.length > 0

  const productCount =
    products.length > 0 ? products.length : (storeInfo.productCount ?? 0)
  const collectionCount =
    collections.length > 0 ? collections.length : (storeInfo.collectionCount ?? 0)

  const data: SpyKitStoreData = {
    theme: raw,
    themeSchemaName: str(raw?.schema_name) || tn?.name || '',
    themeSchemaVersion: str(raw?.schema_version) || tn?.version || '',
    themeRenamed: str(raw?.name) || tn?.themeRenamed || '',
    themeNormalized: tn,
    apps: storeInfo.apps ?? [],
    domain: storeInfo.domain,
    shopMeta: storeInfo.shopMeta ?? null,
    storeName:
      (typeof storeInfo.shopMeta?.name === 'string' && storeInfo.shopMeta.name.trim()) || '',
    productCount,
    collectionCount,
    catalogLoading: storeInfo.catalogLoading ?? false,
    catalogLinkingCollections: storeInfo.catalogLinkingCollections ?? false,
    detectedAt: storeInfo.detectedAt,
    products,
    collections,
    catalogFullDataInIndexedDb: catalogFull,
    storeContacts: storeInfo.storeContacts ?? null,
  }

  window.storeData = data
}
