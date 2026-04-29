import { useCallback, useEffect, useRef, useState } from 'react'
import Header from './components/Header'
import Nav, { type PageId } from './components/Nav'
import Footer from './components/Footer'
import ToastStack from './components/ToastStack'
import SettingsModal from './components/SettingsModal'
import { useStoreInfo } from './hooks/useStoreInfo'
import { useSpykitStore } from './store/useSpykitStore'
import OverviewPage from './pages/OverviewPage'
import ThemePage from './pages/ThemePage'
import ComparePage from './pages/ComparePage'
import AppsPage from './pages/AppsPage'
import ScraperPage from './pages/ScraperPage'
import DownloadsPage from './pages/DownloadsPage'
import ExportPage from './pages/ExportPage'
import type { PopupSettings } from '../types'
import {
  DEFAULT_POPUP_SETTINGS,
  loadPopupSettings,
  mergePopupSettings,
  persistPopupSettings,
} from '../lib/popupSettings'

export default function App() {
  const [settings, setSettings] = useState<PopupSettings>(DEFAULT_POPUP_SETTINGS)
  const [settingsReady, setSettingsReady] = useState(false)
  const [spykitSettingsOpen, setSpykitSettingsOpen] = useState(false)

  const readyRef = useRef(false)
  const scopedDomainAppliedRef = useRef<string | null>(null)

  // Kick off the full data load pipeline → writes into Zustand store
  useStoreInfo()

  // Read everything from the Zustand store
  const storeInfo = useSpykitStore((s) => s.storeInfo)
  const storeInfoLoaded = useSpykitStore((s) => s.storeInfoLoaded)
  const products = useSpykitStore((s) => s.products)
  const collections = useSpykitStore((s) => s.collections)
  const storefrontEligibility = useSpykitStore((s) => s.storefrontEligibility)

  const tabsEnabled = storefrontEligibility === 'eligible'
  const currentDomain = (storeInfo?.domain ?? '').trim().toLowerCase()

  const toScopedPatch = useCallback((patch: Partial<PopupSettings>) => {
    const out: Partial<PopupSettings> = {}
    if (patch.activeTab != null) out.activeTab = patch.activeTab
    if (patch.scrollY != null) out.scrollY = patch.scrollY
    if (patch.appsExpandedAppKey != null) out.appsExpandedAppKey = patch.appsExpandedAppKey
    if (patch.appsScrollY != null) out.appsScrollY = patch.appsScrollY
    if (patch.scraperView != null) out.scraperView = patch.scraperView
    if (patch.scraperPage != null) out.scraperPage = patch.scraperPage
    if (patch.scraperSearch != null) out.scraperSearch = patch.scraperSearch
    if (patch.scraperStockFilter != null) out.scraperStockFilter = patch.scraperStockFilter
    if (patch.scraperVendorFilters != null) out.scraperVendorFilters = patch.scraperVendorFilters
    if (patch.scraperTypeFilters != null) out.scraperTypeFilters = patch.scraperTypeFilters
    if (patch.scraperCatalogFilters != null) out.scraperCatalogFilters = patch.scraperCatalogFilters
    if (patch.scraperPerPage != null) out.scraperPerPage = patch.scraperPerPage
    return out
  }, [])

  useEffect(() => {
    void loadPopupSettings().then((s) => {
      console.log('[SpyKit Popup] restored table page:', s.scraperPage, {
        view: s.scraperView,
        perPage: s.scraperPerPage,
        activeTab: s.activeTab,
      })
      setSettings(s)
      if (s.scrollY > 0) {
        requestAnimationFrame(() => window.scrollTo({ top: s.scrollY, behavior: 'auto' }))
      }
      readyRef.current = true
      setSettingsReady(true)
    })
  }, [])

  const updateSettings = useCallback((patch: Partial<PopupSettings>) => {
    if (!readyRef.current) return
    setSettings((prev) => {
      const entries = Object.entries(patch) as Array<[keyof PopupSettings, PopupSettings[keyof PopupSettings]]>
      const changed = entries.some(([k, v]) => {
        const cur = prev[k]
        if (Array.isArray(cur) && Array.isArray(v)) {
          if (cur.length !== v.length) return true
          for (let i = 0; i < cur.length; i += 1) {
            if (cur[i] !== v[i]) return true
          }
          return false
        }
        return cur !== v
      })
      if (!changed) return prev
      const scopedPatch = toScopedPatch(patch)
      const next = mergePopupSettings(prev, patch)
      if (currentDomain && Object.keys(scopedPatch).length > 0) {
        next.storeUiByDomain = {
          ...(prev.storeUiByDomain ?? {}),
          ...(next.storeUiByDomain ?? {}),
          [currentDomain]: {
            activeTab: next.activeTab,
            scrollY: next.scrollY,
            appsExpandedAppKey: next.appsExpandedAppKey,
            appsScrollY: next.appsScrollY,
            scraperView: next.scraperView,
            scraperPage: next.scraperPage,
            scraperSearch: next.scraperSearch,
            scraperStockFilter: next.scraperStockFilter,
            scraperVendorFilters: next.scraperVendorFilters,
            scraperTypeFilters: next.scraperTypeFilters,
            scraperCatalogFilters: next.scraperCatalogFilters,
            scraperPerPage: next.scraperPerPage,
          },
        }
      }
      void persistPopupSettings(next)
      return next
    })
  }, [currentDomain, toScopedPatch])

  useEffect(() => {
    if (!settingsReady) return
    if (!currentDomain) return
    if (scopedDomainAppliedRef.current === currentDomain) return

    const scoped = settings.storeUiByDomain?.[currentDomain]
    const patch = scoped
      ? {
          activeTab: scoped.activeTab,
          scrollY: scoped.scrollY,
          appsExpandedAppKey: scoped.appsExpandedAppKey,
          appsScrollY: scoped.appsScrollY,
          scraperView: scoped.scraperView,
          scraperPage: scoped.scraperPage,
          scraperSearch: scoped.scraperSearch,
          scraperStockFilter: scoped.scraperStockFilter,
          scraperVendorFilters: scoped.scraperVendorFilters,
          scraperTypeFilters: scoped.scraperTypeFilters,
          scraperCatalogFilters: scoped.scraperCatalogFilters,
          scraperPerPage: scoped.scraperPerPage,
        }
      : {
          activeTab: DEFAULT_POPUP_SETTINGS.activeTab,
          scrollY: DEFAULT_POPUP_SETTINGS.scrollY,
          appsExpandedAppKey: DEFAULT_POPUP_SETTINGS.appsExpandedAppKey,
          appsScrollY: DEFAULT_POPUP_SETTINGS.appsScrollY,
          scraperView: DEFAULT_POPUP_SETTINGS.scraperView,
          scraperPage: DEFAULT_POPUP_SETTINGS.scraperPage,
          scraperSearch: DEFAULT_POPUP_SETTINGS.scraperSearch,
          scraperStockFilter: DEFAULT_POPUP_SETTINGS.scraperStockFilter,
          scraperVendorFilters: DEFAULT_POPUP_SETTINGS.scraperVendorFilters,
          scraperTypeFilters: DEFAULT_POPUP_SETTINGS.scraperTypeFilters,
          scraperCatalogFilters: DEFAULT_POPUP_SETTINGS.scraperCatalogFilters,
          scraperPerPage: DEFAULT_POPUP_SETTINGS.scraperPerPage,
        }

    setSettings((prev) => {
      const next = mergePopupSettings(prev, patch)
      void persistPopupSettings(next)
      return next
    })
    requestAnimationFrame(() => window.scrollTo({ top: patch.scrollY, behavior: 'auto' }))
    scopedDomainAppliedRef.current = currentDomain
  }, [currentDomain, settings.storeUiByDomain, settingsReady])

  const handlePersistScraperViewState = useCallback(
    (payload: {
      view: 'products' | 'collections'
      page: number
      search: string
      stockFilter: 'all' | 'in' | 'out'
      vendorFilters: string[]
      typeFilters: string[]
      catalogFilters: string[]
      perPage: 10 | 25 | 50
    }) => {
      updateSettings({
        scraperView: payload.view,
        scraperPage: payload.page,
        scraperSearch: payload.search,
        scraperStockFilter: payload.stockFilter,
        scraperVendorFilters: payload.vendorFilters,
        scraperTypeFilters: payload.typeFilters,
        scraperCatalogFilters: payload.catalogFilters,
        scraperPerPage: payload.perPage,
      })
    },
    [updateSettings],
  )

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (!readyRef.current) return
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        const y = Math.max(0, Math.floor(window.scrollY))
        setSettings((prev) => {
          const next = mergePopupSettings(prev, { scrollY: y })
          void persistPopupSettings(next)
          return next
        })
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // Only force-reset to store when the tab is *confirmed* ineligible (not while still checking).
  // Resetting during 'checking' would wipe the activeTab restored from chrome.storage.
  useEffect(() => {
    if (storefrontEligibility === 'ineligible' && settings.activeTab !== 'store') {
      updateSettings({ activeTab: 'store' })
    }
  }, [storefrontEligibility, settings.activeTab, updateSettings])

  return (
    <div className="app-container">
      <ToastStack />
      <SettingsModal
        open={spykitSettingsOpen}
        onClose={() => setSpykitSettingsOpen(false)}
        storeDomainHint={storeInfo?.domain ?? null}
      />
      <Header onOpenSettings={() => setSpykitSettingsOpen(true)} />
      <Nav
        activePage={settings.activeTab}
        tabsEnabled={tabsEnabled}
        onNavigate={(page: PageId) => {
          updateSettings({ activeTab: page })
        }}
      />
      <main className="content">
        <div className={`view${settings.activeTab === 'store' ? ' active' : ''}`}>
          <OverviewPage
            storefrontEligibility={storefrontEligibility}
            storeInfo={storeInfo}
            storeInfoLoaded={storeInfoLoaded}
            catalogProductCount={products.length}
            catalogCollectionCount={collections.length}
            catalogProducts={products}
            onNavigate={(p, opts) => {
              if (p === 'scraper' && opts?.scraperView != null) {
                updateSettings({ activeTab: p, scraperView: opts.scraperView })
              } else {
                updateSettings({ activeTab: p })
              }
            }}
          />
        </div>
        <div className={`view${settings.activeTab === 'theme' ? ' active' : ''}`}>
          <ThemePage storeInfo={storeInfo} />
        </div>
        <div className={`view${settings.activeTab === 'compare' ? ' active' : ''}`}>
          <ComparePage />
        </div>
        <div className={`view${settings.activeTab === 'apps' ? ' active' : ''}`}>
          <AppsPage
            storeInfo={storeInfo}
            storeInfoLoaded={storeInfoLoaded}
            persistedExpandedAppKey={settings.appsExpandedAppKey}
            persistedScrollY={settings.appsScrollY}
            onPersistAppsState={(patch) => updateSettings(patch)}
            isActive={settings.activeTab === 'apps'}
          />
        </div>
        <div className={`view${settings.activeTab === 'scraper' ? ' active' : ''}`}>
          {settingsReady && (
            <ScraperPage
              storeInfo={storeInfo}
              products={products}
              collections={collections}
              isActive={settings.activeTab === 'scraper'}
              initialView={settings.scraperView}
              initialPage={settings.scraperPage}
              initialSearch={settings.scraperSearch}
              initialStockFilter={settings.scraperStockFilter}
              initialVendorFilters={settings.scraperVendorFilters}
              initialTypeFilters={settings.scraperTypeFilters}
              initialCatalogFilters={settings.scraperCatalogFilters}
              initialPerPage={settings.scraperPerPage}
            onPersistViewState={handlePersistScraperViewState}
            />
          )}
        </div>
        <div className={`view${settings.activeTab === 'downloads' ? ' active' : ''}`}>
          <DownloadsPage />
        </div>
        <div className={`view${settings.activeTab === 'export' ? ' active' : ''}`}>
          <ExportPage />
        </div>
      </main>
      <Footer />
    </div>
  )
}
