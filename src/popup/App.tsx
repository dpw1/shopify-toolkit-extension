import { useEffect, useState } from 'react'
import Header from './components/Header'
import Nav, { type PageId } from './components/Nav'
import Footer from './components/Footer'
import { useStoreInfo } from './hooks/useStoreInfo'
import OverviewPage from './pages/OverviewPage'
import ThemePage from './pages/ThemePage'
import AppsPage from './pages/AppsPage'
import ScraperPage from './pages/ScraperPage'
import DownloadsPage from './pages/DownloadsPage'
import ExportPage from './pages/ExportPage'

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [activePage, setActivePage] = useState<PageId>('overview')
  const storeInfo = useStoreInfo()

  useEffect(() => {
    try {
      chrome.storage.local.get(['theme'], (result) => {
        if (result['theme'] === 'dark' || result['theme'] === 'light') {
          setTheme(result['theme'] as 'light' | 'dark')
        }
      })
    } catch {
      const saved = localStorage.getItem('spakit-theme')
      if (saved === 'dark' || saved === 'light') setTheme(saved)
    }
  }, [])

  function handleToggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      chrome.storage.local.set({ theme: next })
    } catch {
      localStorage.setItem('spakit-theme', next)
    }
  }

  return (
    <div className="app-container">
      <Header theme={theme} onToggleTheme={handleToggleTheme} />
      <Nav activePage={activePage} onNavigate={setActivePage} />
      <main className="content">
        <div className={`view${activePage === 'overview' ? ' active' : ''}`}>
          <OverviewPage storeInfo={storeInfo} onNavigate={setActivePage} />
        </div>
        <div className={`view${activePage === 'theme' ? ' active' : ''}`}>
          <ThemePage storeInfo={storeInfo} />
        </div>
        <div className={`view${activePage === 'apps' ? ' active' : ''}`}>
          <AppsPage />
        </div>
        <div className={`view${activePage === 'scraper' ? ' active' : ''}`}>
          <ScraperPage storeInfo={storeInfo} />
        </div>
        <div className={`view${activePage === 'downloads' ? ' active' : ''}`}>
          <DownloadsPage />
        </div>
        <div className={`view${activePage === 'export' ? ' active' : ''}`}>
          <ExportPage />
        </div>
      </main>
      <Footer />
    </div>
  )
}
