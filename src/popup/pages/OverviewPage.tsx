import type { KeyboardEvent } from 'react'
import type { StoreInfo } from '../../types'
import type { PageId } from '../components/Nav'
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Folder,
  Package,
  Puzzle,
  ShoppingBag,
  Store,
  Table,
  Tag,
} from 'lucide-react'

interface OverviewPageProps {
  storeInfo: StoreInfo | null
  /** Pass `scraperView` when opening the Products tab so the correct sub-view (products vs collections) shows. */
  onNavigate: (page: PageId, options?: { scraperView?: 'products' | 'collections' }) => void
}

function fmt(n: number) {
  return n.toLocaleString()
}

function keyActivate(fn: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  }
}

export default function OverviewPage({ storeInfo, onNavigate }: OverviewPageProps) {
  const t = storeInfo?.theme
  const connected = Boolean(storeInfo?.detectedAt && storeInfo?.domain)
  const domain = storeInfo?.domain ?? 'Open a Shopify storefront'
  const subtitle =
    t != null
      ? `${t.name}${t.themeRenamed && t.themeRenamed !== t.name ? ` (${t.themeRenamed})` : ''} \u2022 v${t.version || '\u2014'} \u2022 ${t.isOS2 ? 'OS 2.0' : 'Legacy / unknown'}`
      : 'Theme and catalog counts load after the page reports data.'

  const catalogBusy = storeInfo?.catalogLoading === true
  const displayStoreName =
    (typeof storeInfo?.shopMeta?.name === 'string' && storeInfo.shopMeta.name.trim()) ||
    storeInfo?.storeName?.trim() ||
    ''

  return (
    <>
      <div className="card overview-top-card">
        <div className="flex-between">
          <div className="flex-center">
            <div className="app-logo green" style={{ width: 32, height: 32, borderRadius: 6 }}>
              <ShoppingBag size={16} color="white" strokeWidth={2} aria-hidden />
            </div>
            <span className="store-url">
              {domain}
              <span
                className="tag"
                style={{
                  background: connected ? 'var(--success-bg)' : 'var(--bg-hover)',
                  color: connected ? 'var(--success)' : 'var(--text-muted)',
                }}
              >
                {connected && <span className="status-dot" />}
                {connected ? 'Connected' : 'No data'}
              </span>
            </span>
          </div>
          <button type="button" className="btn">
            View Report
            <ArrowRight size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div
          style={{
            marginTop: 8,
            color: 'var(--text-muted)',
            fontSize: 'var(--text-sm)',
            marginLeft: 40,
          }}
        >
          {subtitle}
        </div>

        <div className="overview-stats">
          <div
            role="button"
            tabIndex={0}
            className="stat-card"
            onClick={() => onNavigate('theme')}
            onKeyDown={keyActivate(() => onNavigate('theme'))}
          >
            <div className="stat-header">
              <Store
                className="stat-icon"
                style={{ color: 'var(--primary)', background: 'var(--primary-light)' }}
                strokeWidth={2}
              />
              Store name
            </div>
            <div className="stat-value flex-center">
              {displayStoreName || '—'}
              {displayStoreName ? (
                <CheckCircle2 size={16} color="var(--success)" strokeWidth={2} aria-hidden />
              ) : null}
            </div>
            <div className="stat-link">Theme details &gt;</div>
          </div>
          <div
            role="button"
            tabIndex={0}
            className="stat-card"
            onClick={() => onNavigate('apps')}
            onKeyDown={keyActivate(() => onNavigate('apps'))}
          >
            <div className="stat-header">
              <Puzzle
                className="stat-icon"
                style={{ color: 'var(--info)', background: 'var(--info-bg)' }}
                strokeWidth={2}
              />
              Apps
            </div>
            <div className="stat-value">{storeInfo?.apps?.length != null ? fmt(storeInfo.apps.length) : '—'}</div>
            <div className="stat-link">View &gt;</div>
          </div>
          <div
            role="button"
            tabIndex={0}
            className="stat-card"
            onClick={() => onNavigate('scraper', { scraperView: 'products' })}
            onKeyDown={keyActivate(() => onNavigate('scraper', { scraperView: 'products' }))}
          >
            <div className="stat-header">
              <Package
                className="stat-icon"
                style={{ color: 'var(--success)', background: 'var(--success-bg)' }}
                strokeWidth={2}
              />
              Products
            </div>
            <div className="stat-value">
              {catalogBusy ? <span className="stat-skeleton" aria-hidden /> : fmt(storeInfo?.productCount ?? 0)}
            </div>
            <div className="stat-link">View &gt;</div>
          </div>
          <div
            role="button"
            tabIndex={0}
            className="stat-card"
            onClick={() => onNavigate('scraper', { scraperView: 'collections' })}
            onKeyDown={keyActivate(() => onNavigate('scraper', { scraperView: 'collections' }))}
          >
            <div className="stat-header">
              <Folder
                className="stat-icon"
                style={{ color: 'var(--warning)', background: 'var(--warning-bg)' }}
                strokeWidth={2}
              />
              Collections
            </div>
            <div className="stat-value">
              {catalogBusy ? <span className="stat-skeleton" aria-hidden /> : fmt(storeInfo?.collectionCount ?? 0)}
            </div>
            <div className="stat-link">View &gt;</div>
          </div>
        </div>
      </div>

      <h3 className="section-title">Quick Actions</h3>
      <div className="quick-actions-grid">
        <div
          role="button"
          tabIndex={0}
          className="action-card"
          onClick={() => onNavigate('scraper', { scraperView: 'products' })}
          onKeyDown={keyActivate(() => onNavigate('scraper', { scraperView: 'products' }))}
        >
          <Package className="action-icon purple" size={20} strokeWidth={2} aria-hidden />
          <div className="action-text">
            <h4>
              Scrape Products
              <ChevronRight size={14} style={{ marginLeft: 'auto' }} strokeWidth={2} aria-hidden />
            </h4>
            <p>Extract all products</p>
          </div>
        </div>
        <div
          role="button"
          tabIndex={0}
          className="action-card"
          onClick={() => onNavigate('scraper', { scraperView: 'collections' })}
          onKeyDown={keyActivate(() => onNavigate('scraper', { scraperView: 'collections' }))}
        >
          <Folder className="action-icon orange" size={20} strokeWidth={2} aria-hidden />
          <div className="action-text">
            <h4>
              By Collection
              <ChevronRight size={14} style={{ marginLeft: 'auto' }} strokeWidth={2} aria-hidden />
            </h4>
            <p>Scrape by collection</p>
          </div>
        </div>
        <div
          role="button"
          tabIndex={0}
          className="action-card"
          onClick={() => onNavigate('downloads')}
          onKeyDown={keyActivate(() => onNavigate('downloads'))}
        >
          <Download className="action-icon blue" size={20} strokeWidth={2} aria-hidden />
          <div className="action-text">
            <h4>
              Download Images
              <ChevronRight size={14} style={{ marginLeft: 'auto' }} strokeWidth={2} aria-hidden />
            </h4>
            <p>Download all images</p>
          </div>
        </div>
        <div
          role="button"
          tabIndex={0}
          className="action-card"
          onClick={() => onNavigate('export')}
          onKeyDown={keyActivate(() => onNavigate('export'))}
        >
          <FileSpreadsheet className="action-icon green" size={20} strokeWidth={2} aria-hidden />
          <div className="action-text">
            <h4>
              Export to CSV
              <ChevronRight size={14} style={{ marginLeft: 'auto' }} strokeWidth={2} aria-hidden />
            </h4>
            <p>Shopify import format</p>
          </div>
        </div>
        <div
          role="button"
          tabIndex={0}
          className="action-card"
          onClick={() => onNavigate('export')}
          onKeyDown={keyActivate(() => onNavigate('export'))}
        >
          <Table className="action-icon green" size={20} strokeWidth={2} aria-hidden />
          <div className="action-text">
            <h4>
              Export to XLSX
              <ChevronRight size={14} style={{ marginLeft: 'auto' }} strokeWidth={2} aria-hidden />
            </h4>
            <p>Excel with data types</p>
          </div>
        </div>
        <div className="action-card">
          <Tag className="action-icon purple" size={20} strokeWidth={2} aria-hidden />
          <div className="action-text">
            <h4>
              Slow Mode
              <span className="badge-pro" style={{ padding: '0 4px', fontSize: 10 }}>
                Pro
              </span>
              <ChevronRight size={14} style={{ marginLeft: 'auto' }} strokeWidth={2} aria-hidden />
            </h4>
            <p>Get more fields</p>
          </div>
        </div>
      </div>
    </>
  )
}
