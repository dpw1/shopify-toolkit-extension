import { useCallback, useEffect, useRef, useState } from 'react'
import Header from './components/Header'
import Nav, { type PageId } from './components/Nav'
import Footer from './components/Footer'
import ToastStack from './components/ToastStack'
import SettingsModal from './components/SettingsModal'
import { useStoreInfo } from './hooks/useStoreInfo'
import OverviewPage from './pages/OverviewPage'
import ThemePage from './pages/ThemePage'
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
  const { storeInfo, storeInfoLoaded, products, collections } = useStoreInfo()

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
      const next = mergePopupSettings(prev, patch)
      void persistPopupSettings(next)
      return next
    })
  }, [])

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
        onNavigate={(page: PageId) => {
          updateSettings({ activeTab: page })
        }}
      />
      <main className="content">
        <div className={`view${settings.activeTab === 'store' ? ' active' : ''}`}>
          <OverviewPage
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
        <div className={`view${settings.activeTab === 'apps' ? ' active' : ''}`}>
          <AppsPage storeInfo={storeInfo} />
        </div>
        <div className={`view${settings.activeTab === 'scraper' ? ' active' : ''}`}>
          {settingsReady && (
            <ScraperPage
              storeInfo={storeInfo}
              products={products}
              collections={collections}
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
