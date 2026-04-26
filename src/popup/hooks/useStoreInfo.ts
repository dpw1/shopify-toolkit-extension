import { useEffect, useRef } from 'react'
import { onStorageChange } from '../../lib/storage'
import {
  checkActiveTabHasShopifyTheme,
  fetchAllData,
  loadPopupStoreBundle,
  requestContentShopScanFromPopup,
} from '../lib/popupStoreLoader'
import { syncPopupStoreData } from '../windowStoreData'
import { useSpykitStore } from '../store/useSpykitStore'

export type StorefrontEligibility = 'checking' | 'eligible' | 'ineligible'

/**
 * Orchestrates the popup data load using the centralized fetchAllData pipeline.
 * All state is written to the Zustand store (useSpykitStore) so every component
 * can subscribe independently without prop-drilling.
 *
 * Flow:
 *  1. Check Shopify theme presence on active tab
 *  2. Run content scan (page-world theme + app detection)
 *  3. fetchAllData: store meta → collections → products → apps (with per-step toasts)
 *  4. Re-run on storeCacheByDomain storage changes
 */
export function useStoreInfo(): void {
  const {
    setStoreInfo,
    setProducts,
    setCollections,
    setLastFetchedAt,
    setFetchStep,
    setStoreInfoLoaded,
    setStorefrontEligibility,
  } = useSpykitStore()

  const eligibleRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function applyBundle(bundle: Awaited<ReturnType<typeof loadPopupStoreBundle>>) {
      const si = bundle?.storeInfo ?? null
      await syncPopupStoreData(si)

      const p = bundle?.products ?? window.storeData?.products ?? []
      const c = bundle?.collections ?? window.storeData?.collections ?? []

      if (!cancelled) {
        setStoreInfo(si)
        setProducts(p)
        setCollections(c)
      }
    }

    async function runLoad() {
      const hasShopifyTheme = await checkActiveTabHasShopifyTheme()
      if (cancelled) return

      if (!hasShopifyTheme) {
        eligibleRef.current = false
        setStorefrontEligibility('ineligible')
        await applyBundle(null)
        if (!cancelled) setStoreInfoLoaded(true)
        return
      }

      eligibleRef.current = true
      setStorefrontEligibility('eligible')

      // Content scan first so PAGE_DATA (theme) lands before we read cache.
      await requestContentShopScanFromPopup()

      const bundle = await fetchAllData((step) => {
        if (!cancelled) setFetchStep(step)
      })

      if (cancelled) return

      await applyBundle(bundle)

      if (!cancelled) {
        setStoreInfoLoaded(true)
        setLastFetchedAt(Date.now())
        setFetchStep('done')
      }
    }

    void runLoad()

    const unsub = onStorageChange('storeCacheByDomain', () => {
      void (async () => {
        if (!eligibleRef.current) return
        const bundle = await loadPopupStoreBundle()
        if (cancelled) return
        if (bundle) await applyBundle(bundle)
      })()
    })

    // DevTools: await window.spykitLoadStore()
    ;(window as unknown as { spykitLoadStore?: () => Promise<void> }).spykitLoadStore =
      async () => {
        if (!eligibleRef.current) return
        const bundle = await fetchAllData((step) => setFetchStep(step))
        if (bundle) {
          await applyBundle(bundle)
          setLastFetchedAt(Date.now())
          setFetchStep('done')
        }
      }

    return () => {
      cancelled = true
      eligibleRef.current = false
      unsub()
      delete (window as unknown as { spykitLoadStore?: () => Promise<void> }).spykitLoadStore
    }
  }, [
    setCollections,
    setFetchStep,
    setLastFetchedAt,
    setProducts,
    setStoreInfo,
    setStoreInfoLoaded,
    setStorefrontEligibility,
  ])
}
