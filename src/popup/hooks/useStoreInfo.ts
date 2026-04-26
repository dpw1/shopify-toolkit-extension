import { useEffect, useRef } from 'react'
import { onStorageChange } from '../../lib/storage'
import {
  checkActiveTabHasShopifyTheme,
  fetchAllData,
  loadPopupStoreBundle,
  requestContentShopScanFromPopup,
  type PopupStoreBundle,
} from '../lib/popupStoreLoader'
import { syncPopupStoreData } from '../windowStoreData'
import { useSpykitStore } from '../store/useSpykitStore'

function bundleHasThemeRow(bundle: PopupStoreBundle | null): boolean {
  const si = bundle?.storeInfo
  if (!si) return false
  if (si.theme != null) return true
  const raw = si.shopifyThemeRaw
  return raw != null && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length > 0
}

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
      console.log('[SpyKit Popup] useStoreInfo: runLoad start')
      const hasShopifyTheme = await checkActiveTabHasShopifyTheme()
      if (cancelled) return

      if (!hasShopifyTheme) {
        console.log('[SpyKit Popup] useStoreInfo: tab has no Shopify.theme — ineligible')
        eligibleRef.current = false
        setStorefrontEligibility('ineligible')
        await applyBundle(null)
        if (!cancelled) setStoreInfoLoaded(true)
        return
      }

      eligibleRef.current = true
      setStorefrontEligibility('eligible')

      // Content scan first so PAGE_DATA (theme) lands before we read cache.
      const scanRes = await requestContentShopScanFromPopup()
      console.log('[SpyKit Popup] useStoreInfo: SPYKIT_RUN_SHOP_SCAN done', scanRes)

      const bundle = await fetchAllData((step) => {
        if (!cancelled) setFetchStep(step)
      })

      if (cancelled) return

      console.log('[SpyKit Popup] useStoreInfo: fetchAllData bundle', {
        domain: bundle?.domain,
        hasThemeRow: bundleHasThemeRow(bundle),
        apps: bundle?.storeInfo?.apps?.length ?? 0,
        products: bundle?.products?.length ?? 0,
      })
      await applyBundle(bundle)

      if (!cancelled) {
        setStoreInfoLoaded(true)
        setLastFetchedAt(Date.now())
        setFetchStep('done')
        console.log('[SpyKit Popup] useStoreInfo: runLoad complete')
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

    // DevTools: await window.spykitLoadStore() — also used after FORCE_REFRESH_STORE (Re-sync).
    ;(window as unknown as { spykitLoadStore?: () => Promise<void> }).spykitLoadStore =
      async () => {
        if (!eligibleRef.current) {
          console.warn('[SpyKit Popup] spykitLoadStore: skipped (tab not eligible)')
          return
        }
        console.log('[SpyKit Popup] spykitLoadStore: start (re-run content scan + wait for cache)')

        const scanRes = await requestContentShopScanFromPopup()
        console.log('[SpyKit Popup] spykitLoadStore: content scan finished', scanRes)

        // After a force refresh, chrome.storage may lag PAGE_DATA; poll until theme row exists.
        let bundle: Awaited<ReturnType<typeof loadPopupStoreBundle>> | null = null
        for (let attempt = 0; attempt < 15; attempt++) {
          bundle = await loadPopupStoreBundle()
          const hasTheme = bundleHasThemeRow(bundle)
          console.log('[SpyKit Popup] spykitLoadStore: cache poll', {
            attempt: attempt + 1,
            domain: bundle?.domain ?? null,
            hasTheme,
            apps: bundle?.storeInfo?.apps?.length ?? 0,
            catalogLoading: bundle?.storeInfo?.catalogLoading,
          })
          if (hasTheme) break
          await new Promise((r) => setTimeout(r, 220))
        }

        const finalBundle = await fetchAllData((step) => setFetchStep(step))
        console.log('[SpyKit Popup] spykitLoadStore: fetchAllData after poll', {
          domain: finalBundle?.domain,
          hasThemeRow: bundleHasThemeRow(finalBundle),
          apps: finalBundle?.storeInfo?.apps?.length ?? 0,
          products: finalBundle?.products?.length ?? 0,
        })

        if (finalBundle) {
          await applyBundle(finalBundle)
          setLastFetchedAt(Date.now())
          setFetchStep('done')
          console.log('[SpyKit Popup] spykitLoadStore: applied to Zustand / window.storeData')
        } else {
          console.warn('[SpyKit Popup] spykitLoadStore: fetchAllData returned null')
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
