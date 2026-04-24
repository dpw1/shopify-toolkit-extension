import type { SpyKitStoreData, StoreInfo } from '../types'

function str(v: unknown): string {
  if (v == null) return ''
  const s = String(v).trim()
  return s
}

/** Expose the latest store snapshot on `window` for DevTools / debugging. */
export function syncPopupStoreData(storeInfo: StoreInfo | null): void {
  const raw = storeInfo?.shopifyThemeRaw ?? null
  const tn = storeInfo?.theme ?? null

  const data: SpyKitStoreData = storeInfo
    ? {
        theme: raw,
        themeSchemaName: str(raw?.schema_name) || tn?.name || '',
        themeSchemaVersion: str(raw?.schema_version) || tn?.version || '',
        themeRenamed: str(raw?.name) || tn?.themeRenamed || '',
        themeNormalized: tn,
        apps: storeInfo.apps ?? [],
        domain: storeInfo.domain,
        productCount: storeInfo.productCount,
        collectionCount: storeInfo.collectionCount,
        catalogLoading: storeInfo.catalogLoading ?? false,
        detectedAt: storeInfo.detectedAt,
        products: storeInfo.productsSample ?? [],
        collections: storeInfo.collectionsSample ?? [],
        catalogFullDataInIndexedDb: storeInfo.catalogFullDataInIndexedDb ?? false,
      }
    : {
        theme: null,
        themeSchemaName: '',
        themeSchemaVersion: '',
        themeRenamed: '',
        themeNormalized: null,
        apps: [],
        domain: '',
        productCount: 0,
        collectionCount: 0,
        catalogLoading: false,
        products: [],
        collections: [],
        catalogFullDataInIndexedDb: false,
      }

  window.storeData = data
}
