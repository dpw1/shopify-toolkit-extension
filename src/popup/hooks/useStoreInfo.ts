import { useEffect, useState } from 'react'
import type { CatalogCollectionRow, CatalogProductRow, StoreInfo } from '../../types'
import { onStorageChange } from '../../lib/storage'
import { loadPopupStoreBundle } from '../lib/popupStoreLoader'
import { syncPopupStoreData } from '../windowStoreData'

/**
 * Loads store snapshot for the active tab into React state + `window.storeData`.
 *
 * Flow is centralized in `../lib/popupStoreLoader.ts` (`loadPopupStoreBundle`):
 * resolve `Shopify.shop` / `/meta.json` → read `storeCacheByDomain` → read IDB
 * → optionally kick off background catalog sync.
 *
 * `products` and `collections` are surfaced as their own state — NOT derived
 * from `storeInfo.productsSample` — so ScraperPage always receives the IDB
 * arrays the moment they are available, without depending on useMemo chains.
 */
export function useStoreInfo(): {
  storeInfo: StoreInfo | null
  storeInfoLoaded: boolean
  products: CatalogProductRow[]
  collections: CatalogCollectionRow[]
} {
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null)
  const [storeInfoLoaded, setStoreInfoLoaded] = useState(false)
  const [products, setProducts] = useState<CatalogProductRow[]>([])
  const [collections, setCollections] = useState<CatalogCollectionRow[]>([])

  useEffect(() => {
    let cancelled = false

    async function applyBundle(si: StoreInfo | null) {
      await syncPopupStoreData(si)
      // After syncPopupStoreData, window.storeData is the IDB source of truth.
      // Mirror the same arrays into explicit React state so ScraperPage is
      // driven by these — no useMemo chain, no stale-reference risk.
      const p = window.storeData?.products ?? []
      const c = window.storeData?.collections ?? []
      if (!cancelled) {
        setProducts(p)
        setCollections(c)
        setStoreInfo(si)
      }
    }

    async function runLoad() {
      const bundle = await loadPopupStoreBundle()
      if (cancelled) return
      await applyBundle(bundle?.storeInfo ?? null)
      if (!cancelled) setStoreInfoLoaded(true)
    }

    void runLoad()

    const unsub = onStorageChange('storeCacheByDomain', () => {
      void (async () => {
        const bundle = await loadPopupStoreBundle()
        if (cancelled) return
        if (bundle) await applyBundle(bundle.storeInfo)
      })()
    })

    // DevTools: await window.spykitLoadStore()
    ;(window as unknown as { spykitLoadStore?: () => Promise<StoreInfo | null> }).spykitLoadStore =
      async () => {
        const bundle = await loadPopupStoreBundle()
        if (bundle) await applyBundle(bundle.storeInfo)
        return bundle?.storeInfo ?? null
      }

    return () => {
      cancelled = true
      unsub()
      delete (window as unknown as { spykitLoadStore?: () => Promise<StoreInfo | null> })
        .spykitLoadStore
    }
  }, [])

  return { storeInfo, storeInfoLoaded, products, collections }
}
