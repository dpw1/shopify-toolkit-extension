import { useEffect, useRef } from 'react'
import { onStorageChange } from '../../lib/storage'
import {
  checkActiveTabHasShopifyTheme,
  fetchAllData,
  loadPopupStoreBundle,
  spykitFetchThemeAndAppsFromHtml,
  spykitFetchAndPersistMetaJson,
  type SpykitDebugAllResponse,
  type PopupStoreBundle,
} from '../lib/popupStoreLoader'
import type { ShopMetaJson } from '../../types'
import { syncPopupStoreData } from '../windowStoreData'
import { useSpykitStore } from '../store/useSpykitStore'
import type { ShopifyTheme } from '../../types'

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
      const current = useSpykitStore.getState().storeInfo
      const incoming = bundle?.storeInfo ?? null

      // Merge: never discard a good theme/apps already in Zustand with empty bundle data.
      // This prevents fetchAllData (reading chrome.storage) from overwriting theme/apps
      // that were freshly parsed from HTML by applyThemeAppsSnapshot moments before.
      const si: typeof incoming = incoming == null ? null : {
        ...incoming,
        theme: incoming.theme ?? current?.theme ?? null,
        shopifyThemeRaw: incoming.shopifyThemeRaw ?? current?.shopifyThemeRaw ?? null,
        appDetectionResult: incoming.appDetectionResult ?? current?.appDetectionResult ?? null,
        storeContacts: incoming.storeContacts ?? current?.storeContacts,
        // Preserve freshly-fetched shopMeta from step 3 if the bundle hasn't caught up yet.
        shopMeta: incoming.shopMeta ?? current?.shopMeta ?? null,
        productCount:
          (incoming.shopMeta?.published_products_count ?? incoming.productCount)
          || (current?.shopMeta?.published_products_count ?? current?.productCount)
          || incoming.productCount,
        collectionCount:
          (incoming.shopMeta?.published_collections_count ?? incoming.collectionCount)
          || (current?.shopMeta?.published_collections_count ?? current?.collectionCount)
          || incoming.collectionCount,
      }

      await syncPopupStoreData(si)

      const p = bundle?.products ?? window.storeData?.products ?? []
      const c = bundle?.collections ?? window.storeData?.collections ?? []

      if (!cancelled) {
        setStoreInfo(si)
        setProducts(p)
        setCollections(c)
      }
    }

    async function applyThemeAppsSnapshot(snapshot: SpykitDebugAllResponse) {
      if (!snapshot.ok || cancelled) return
      const prev = useSpykitStore.getState().storeInfo
      const normalizedTheme: ShopifyTheme | null =
        snapshot.theme && Object.keys(snapshot.theme).length > 0
          ? {
              ...snapshot.theme,
              name:
                snapshot.theme.name != null && String(snapshot.theme.name).trim()
                  ? String(snapshot.theme.name)
                  : 'Unknown',
              version:
                snapshot.theme.version != null ? String(snapshot.theme.version) : '',
              author:
                snapshot.theme.author != null && String(snapshot.theme.author).trim()
                  ? String(snapshot.theme.author)
                  : 'Shopify',
              isOS2: Boolean(snapshot.theme.isOS2),
            }
          : null
      const merged = {
        ...(prev ?? {
          domain: snapshot.domain,
          theme: null,
          appDetectionResult: null,
          productCount: 0,
          collectionCount: 0,
          detectedAt: Date.now(),
          catalogFullDataInIndexedDb: false,
        }),
        domain: snapshot.domain,
        theme: normalizedTheme,
        shopifyThemeRaw: snapshot.shopifyThemeRaw ?? null,
        appDetectionResult: snapshot.appDetectionResult ?? null,
        ...(snapshot.contacts
          ? { storeContacts: snapshot.contacts }
          : {}),
        detectedAt: Date.now(),
      }
      setStoreInfo(merged)
      await syncPopupStoreData(merged)
      console.log('[SpyKit Popup] Zustand snapshot (theme+apps+contacts)', useSpykitStore.getState())
    }

    // Merge shopMeta into current Zustand storeInfo and re-sync window.storeData.
    // Called immediately after meta.json is fetched so stat boxes + intelligence populate.
    async function applyMetaJson(meta: ShopMetaJson) {
      if (cancelled) return
      const prev = useSpykitStore.getState().storeInfo
      if (!prev) return
      const merged = {
        ...prev,
        shopMeta: meta,
        // Pre-fill counts from meta so UI shows numbers before IDB catalog loads.
        productCount:
          typeof meta.published_products_count === 'number'
            ? meta.published_products_count
            : prev.productCount,
        collectionCount:
          typeof meta.published_collections_count === 'number'
            ? meta.published_collections_count
            : prev.collectionCount,
      }
      setStoreInfo(merged)
      await syncPopupStoreData(merged)
      console.log('[SpyKit Popup] useStoreInfo: meta.json applied', {
        products: merged.productCount,
        collections: merged.collectionCount,
        name: meta.name,
      })
    }

    async function runLoad() {
      console.log('[SpyKit Popup] useStoreInfo: runLoad start')

      // 1) Fast eligibility gate:
      // only continue when the active tab looks like a Shopify storefront.
      const hasShopifyTheme = await checkActiveTabHasShopifyTheme()
      if (cancelled) return

      if (!hasShopifyTheme) {
        // Keep store tab usable, but mark data pipeline as ineligible for this tab.
        console.log('[SpyKit Popup] useStoreInfo: tab has no Shopify.theme — ineligible')
        eligibleRef.current = false
        setStorefrontEligibility('ineligible')
        await applyBundle(null)
        if (!cancelled) setStoreInfoLoaded(true)
        return
      }

      // Eligible storefront tab: proceed with the full load sequence.
      eligibleRef.current = true
      setStorefrontEligibility('eligible')

      // 2) Fetch theme + apps first from full HTML.
      // This gives the UI an immediate, reliable snapshot before slower fetches.
      setFetchStep('fetching-theme')
      const scanRes = await spykitFetchThemeAndAppsFromHtml()
      console.log('[SpyKit Popup] useStoreInfo: HTML theme+apps done', scanRes)
      await applyThemeAppsSnapshot(scanRes)

      // 3) Fetch meta.json immediately and hydrate Zustand.
      // This populates product/collection counts + all Store Intelligence fields
      // (location, currency, ships-to, description, payments) before the IDB catalog loads.
      setFetchStep('fetching-store')
      const metaRes = await spykitFetchAndPersistMetaJson()
      if (cancelled) return
      if (metaRes.ok && metaRes.meta) {
        await applyMetaJson(metaRes.meta)
      }

      // Store tab is considered "loaded" once theme + apps + meta.json are in.
      // Catalog products/collections can continue syncing in the background.
      if (!cancelled) {
        setStoreInfoLoaded(true)
      }

      // 4) Continue the canonical pipeline (IDB catalog + final cache bundle).
      const bundle = await fetchAllData((step) => {
        if (!cancelled) setFetchStep(step)
      })

      if (cancelled) return

      // 5) Apply merged bundle into Zustand/window.storeData.
      // Merge logic preserves fresh theme/apps + shopMeta if bundle is temporarily behind.
      console.log('[SpyKit Popup] useStoreInfo: fetchAllData bundle', {
        domain: bundle?.domain,
        hasThemeRow: bundleHasThemeRow(bundle),
        apps:
          Object.keys(
            ((bundle?.storeInfo?.appDetectionResult as { apps?: Record<string, unknown> } | null)
              ?.apps ?? {}) as Record<string, unknown>,
          ).length,
        products: bundle?.products?.length ?? 0,
      })
      await applyBundle(bundle)

      // 6) Mark pipeline complete for UI indicators.
      if (!cancelled) {
        setLastFetchedAt(Date.now())
        setFetchStep('done')
        console.log('[SpyKit Popup] useStoreInfo: runLoad complete')
      }
    }

    // Hydrate Zustand immediately on popup open with the latest cached bundle (if any),
    // so UI state is available in real-time while the full async flow continues.
    void (async () => {
      const earlyBundle = await loadPopupStoreBundle()
      if (cancelled) return
      if (earlyBundle) {
        await applyBundle(earlyBundle)
        setStoreInfoLoaded(true)
        console.log('[SpyKit Popup] useStoreInfo: early Zustand hydrate applied')
      }
    })()

    void runLoad()

    const unsub = onStorageChange('storeCacheByDomain', () => {
      void (async () => {
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
        console.log('[SpyKit Popup] spykitLoadStore: start (re-fetch HTML → theme+apps → meta)')

        setFetchStep('fetching-theme')
        const scanRes = await spykitFetchThemeAndAppsFromHtml()
        console.log('[SpyKit Popup] spykitLoadStore: HTML theme+apps done', scanRes)
        await applyThemeAppsSnapshot(scanRes)

        const finalBundle = await fetchAllData((step) => setFetchStep(step))
        console.log('[SpyKit Popup] spykitLoadStore: fetchAllData after poll', {
          domain: finalBundle?.domain,
          hasThemeRow: bundleHasThemeRow(finalBundle),
          apps:
            Object.keys(
              ((finalBundle?.storeInfo?.appDetectionResult as { apps?: Record<string, unknown> } | null)
                ?.apps ?? {}) as Record<string, unknown>,
            ).length,
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
