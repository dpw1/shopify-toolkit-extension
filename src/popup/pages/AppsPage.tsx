import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import type { ShopifyApp, StoreInfo } from '../../types'

type PillId = ShopifyApp['category'] | 'all'

const PAGE_SIZE = 12
const PILLS: Array<{ id: PillId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'sales', label: 'Sales' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'other', label: 'Other' },
]

interface AppsPageProps {
  storeInfo: StoreInfo | null
}

function appMatchesQuery(app: ShopifyApp, q: string): boolean {
  const s = q.toLowerCase()
  if (!s) return true
  return (
    app.name.toLowerCase().includes(s) ||
    (app.categoryLabel ?? '').toLowerCase().includes(s) ||
    (app.sourceAppUrl ?? '').toLowerCase().includes(s) ||
    (app.matchScripts ?? []).some((m) => m.toLowerCase().includes(s))
  )
}

export default function AppsPage({ storeInfo }: AppsPageProps) {
  const [pill, setPill] = useState<PillId>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const apps = storeInfo?.apps ?? []

  const filtered = useMemo(() => {
    const byPill = pill === 'all' ? apps : apps.filter((a) => a.category === pill)
    return byPill.filter((a) => appMatchesQuery(a, search))
  }, [apps, pill, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const countsByPill = useMemo(() => {
    return {
      all: apps.length,
      marketing: apps.filter((a) => a.category === 'marketing').length,
      sales: apps.filter((a) => a.category === 'sales').length,
      reviews: apps.filter((a) => a.category === 'reviews').length,
      analytics: apps.filter((a) => a.category === 'analytics').length,
      other: apps.filter((a) => a.category === 'other').length,
    }
  }, [apps])

  return (
    <>
      <div className="apps-filter-bar">
        <div className="search-input">
          <Search size={16} color="var(--text-muted)" strokeWidth={2} aria-hidden />
          <input
            type="search"
            placeholder="Search apps by name, category, URL or script..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="filter-pills">
          {PILLS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`pill${pill === p.id ? ' active' : ''}`}
              onClick={() => {
                setPill(p.id)
                setPage(1)
              }}
            >
              {p.label} ({countsByPill[p.id]})
            </button>
          ))}
        </div>
      </div>

      <div className="apps-summary-row">
        <span>{filtered.length.toLocaleString()} apps detected</span>
        <span className="apps-summary-page">Page {safePage} of {totalPages}</span>
      </div>

      <div className="apps-list">
        <div className="apps-list-scroll">
          {paged.length === 0 ? (
            <div className="apps-empty">No apps found for current filters.</div>
          ) : (
            paged.map((app) => {
              const iconLetter = app.name[0]?.toUpperCase() ?? '?'
              const logoSrc = app.appIconUrl ?? app.iconUrl
              return (
                <div key={`${app.id}-${app.sourceAppUrl ?? app.name}`} className="app-item">
                  <div className="app-info-left">
                    {logoSrc ? (
                      <img className="app-logo app-logo-image" src={logoSrc} alt="" />
                    ) : (
                      <div className="app-logo">{iconLetter}</div>
                    )}
                    <div>
                      <div className="app-name">{app.appTitle ?? app.name}</div>
                      <div className="app-rating">
                        {(app.categoryLabel ?? app.category).toString()}
                        <span className="apps-dot">•</span>
                        {typeof app.reviewOverallRating === 'number' ? `${app.reviewOverallRating.toFixed(1)}★` : 'No rating'}
                        <span className="apps-dot">•</span>
                        {(app.reviewTotal ?? app.reviewCount ?? 0).toLocaleString()} reviews
                        <span className="apps-dot">•</span>
                        {(app.matchScripts?.length ?? 0).toLocaleString()} match
                        {app.matchScripts?.length === 1 ? '' : 'es'}
                      </div>
                      {app.appDescription ? (
                        <div className="apps-description">{app.appDescription}</div>
                      ) : null}
                      <div className="apps-meta-line">
                        {app.languagesSupported ? `Language: ${app.languagesSupported}` : 'Language: —'}
                        <span className="apps-dot">•</span>
                        {app.developerPartnerName ? `Developer: ${app.developerPartnerName}` : 'Developer: —'}
                        <span className="apps-dot">•</span>
                        {(app.categories?.length ?? 0).toLocaleString()} categories
                        <span className="apps-dot">•</span>
                        {(app.appImages?.length ?? 0).toLocaleString()} images
                      </div>
                      {app.usersThinkSummary ? (
                        <div className="apps-summary-snippet">
                          {app.usersThinkSummary}
                        </div>
                      ) : null}
                      {app.sourceAppUrl && (
                        <a className="apps-source-url" href={app.sourceAppUrl} target="_blank" rel="noreferrer">
                          {app.sourceAppUrl}
                        </a>
                      )}
                      {app.reviewUrl ? (
                        <a className="apps-source-url" href={app.reviewUrl} target="_blank" rel="noreferrer">
                          Reviews: {app.reviewUrl}
                        </a>
                      ) : null}
                      {app.viewDemoStoreUrl ? (
                        <a className="apps-source-url" href={app.viewDemoStoreUrl} target="_blank" rel="noreferrer">
                          Demo: {app.viewDemoStoreUrl}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="pagination flex-between">
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              className="page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              <ChevronLeft size={16} strokeWidth={2} aria-hidden />
            </button>
            <button type="button" className="page-btn active">
              {safePage}
            </button>
            <button
              type="button"
              className="page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              <ChevronRight size={16} strokeWidth={2} aria-hidden />
            </button>
          </div>
          <div className="apps-per-page-note">{PAGE_SIZE} per page</div>
        </div>
      </div>
    </>
  )
}

