import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Globe,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  StarHalf,
  ThumbsUp,
  User,
  X,
} from 'lucide-react'
import type { PopupSettings, ShopifyApp, StoreInfo } from '../../types'
import { appendUtmToUrl } from '../lib/appendUtm'

type SortKey = 'rating' | 'reviews' | 'name'

const PAGE_SIZE = 5
const SKELETON_COUNT = 3

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'rating', label: 'Rating' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'name', label: 'Name' },
]

const CATEGORY_TAG_CLASS: Record<string, string> = {
  marketing: 'app-tag--marketing',
  sales: 'app-tag--sales',
  reviews: 'app-tag--reviews',
  analytics: 'app-tag--analytics',
  other: 'app-tag--other',
}

interface AppsPageProps {
  storeInfo: StoreInfo | null
  storeInfoLoaded: boolean
  persistedExpandedAppKey: string
  persistedScrollY: number
  isActive: boolean
  onPersistAppsState: (patch: Partial<PopupSettings>) => void
}

interface AppCardProps {
  app: ShopifyApp
  appKey: string
  expanded: boolean
  onToggleExpanded: (appKey: string) => void
  onImageOpen: (images: string[], startIndex: number) => void
}

function parseJson<T>(val: unknown): T | null {
  if (!val) return null
  if (typeof val === 'object') return val as T
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T
    } catch {
      return null
    }
  }
  return null
}

function toNum(val: unknown): number | null {
  if (typeof val === 'number') return Number.isNaN(val) ? null : val
  if (typeof val === 'string') {
    const n = parseFloat(val)
    return Number.isNaN(n) ? null : n
  }
  return null
}

function parseStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === 'string')
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val)
      return Array.isArray(p) ? p.filter((v: unknown): v is string => typeof v === 'string') : []
    } catch {
      return []
    }
  }
  return []
}

function getAppCategoryLabel(app: ShopifyApp): string {
  const label = (app.categoryLabel ?? app.category ?? 'Other').toString().trim()
  return label || 'Other'
}

function getCategoryId(label: string): string {
  return label.trim().toLowerCase()
}

/** App Store listing categories from scraped `categoriesJson` (JSON string array). */
function getCatalogCategoriesFromJson(app: ShopifyApp): string[] {
  const raw = app as unknown as Record<string, unknown>
  return parseStringArray(raw.categoriesJson)
    .map((c) => c.trim())
    .filter(Boolean)
}

function appMatchesQuery(app: ShopifyApp, q: string): boolean {
  if (!q) return true
  const s = q.toLowerCase()
  const inJsonCats = getCatalogCategoriesFromJson(app).some((c) => c.toLowerCase().includes(s))
  return (
    (app.appTitle ?? app.name ?? '').toLowerCase().includes(s) ||
    getAppCategoryLabel(app).toLowerCase().includes(s) ||
    inJsonCats ||
    (app.sourceAppUrl ?? '').toLowerCase().includes(s) ||
    (app.matchScripts ?? []).some((m) => m.toLowerCase().includes(s))
  )
}

function getSortableRating(app: ShopifyApp): number {
  const raw = app as unknown as Record<string, unknown>
  return toNum(app.reviewOverallRating) ?? toNum(raw.reviewOverallRating) ?? -1
}

function getSortableReviews(app: ShopifyApp): number {
  const raw = app as unknown as Record<string, unknown>
  return toNum(app.reviewTotal) ?? toNum(raw.reviewTotal) ?? toNum(raw.reviewCount) ?? 0
}

function sortApps(apps: ShopifyApp[], key: SortKey): ShopifyApp[] {
  return [...apps].sort((a, b) => {
    if (key === 'rating') return getSortableRating(b) - getSortableRating(a)
    if (key === 'reviews') return getSortableReviews(b) - getSortableReviews(a)
    return (a.appTitle ?? a.name ?? '').localeCompare(b.appTitle ?? b.name ?? '')
  })
}

function makeAppKey(app: ShopifyApp): string {
  return `${app.id ?? ''}::${app.sourceAppUrl ?? app.name}`
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="stars-row">
      {[1, 2, 3, 4, 5].map((i) => {
        if (i <= Math.floor(rating)) return <Star key={i} size={size} fill="#f59e0b" color="#f59e0b" />
        if (i === Math.ceil(rating) && !Number.isInteger(rating)) {
          return <StarHalf key={i} size={size} fill="#f59e0b" color="#f59e0b" />
        }
        return <Star key={i} size={size} fill="transparent" color="#d1d5db" />
      })}
    </span>
  )
}

function AppCard({ app, appKey, expanded, onToggleExpanded, onImageOpen }: AppCardProps) {
  const [descExpanded, setDescExpanded] = useState(false)

  const raw = app as unknown as Record<string, unknown>
  const rating = toNum(app.reviewOverallRating) ?? toNum(raw.reviewOverallRating)
  const reviewTotal = getSortableReviews(app)

  const pricing =
    app.pricing ??
    parseJson<{
      plans?: Array<{ name?: string; price?: string; description?: string; trialInfo?: string }>
      seeAllPricingUrl?: string
    }>(raw.pricingJson)
  const reviewByStars = app.reviewByStars ?? parseJson<Record<string, number>>(raw.reviewByStarsJson)
  const catalogCategories = getCatalogCategoriesFromJson(app)
  const appImages = parseStringArray(app.appImages ?? raw.appImages)

  const iconSrc = app.appIconUrl ?? (raw.iconUrl as string | undefined)
  const iconLetter = (app.appTitle ?? app.name ?? '?')[0]?.toUpperCase()
  const categoryClass = CATEGORY_TAG_CLASS[app.category] ?? 'app-tag--other'
  const categoryLabel = getAppCategoryLabel(app)
  const plans = pricing?.plans ?? []

  const breakdownRows = reviewByStars
    ? [5, 4, 3, 2, 1].map((star) => {
        const count = reviewByStars[String(star)] ?? 0
        const pct = reviewTotal > 0 ? Math.round((count / reviewTotal) * 100) : 0
        return { star, count, pct }
      })
    : []

  const launchDate = app.developerLaunchDate
    ? (() => {
        try {
          return new Date(app.developerLaunchDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        } catch {
          return app.developerLaunchDate
        }
      })()
    : null

  const sourceAppUrl = app.sourceAppUrl ? appendUtmToUrl(app.sourceAppUrl) : null
  const developerPartnerUrl = app.developerPartnerUrl ? appendUtmToUrl(app.developerPartnerUrl) : null
  const viewDemoStoreUrl = app.viewDemoStoreUrl ? appendUtmToUrl(app.viewDemoStoreUrl) : null
  const reviewUrl = app.reviewUrl ? appendUtmToUrl(app.reviewUrl) : null

  return (
    <div className="app-card" id={`app-card-${appKey}`}>
      <div className="card-header">
        <div className="card-header-left">
          {iconSrc ? (
            <img src={iconSrc} alt="" className="app-icon-img" />
          ) : (
            <div className="app-icon-placeholder">{iconLetter}</div>
          )}
          <div className="app-info">
            <h3>
              {sourceAppUrl ? (
                <a href={sourceAppUrl} className="app-title-link" target="_blank" rel="noreferrer">
                  {app.appTitle ?? app.name}
                </a>
              ) : (
                (app.appTitle ?? app.name)
              )}
              <span className={`app-tag ${categoryClass}`}>{categoryLabel}</span>
              {sourceAppUrl && (
                <a href={sourceAppUrl} target="_blank" rel="noreferrer" className="app-link-icon" title="View in App Store">
                  <ExternalLink size={14} />
                </a>
              )}
            </h3>
            <div className="app-meta-row">
              {app.developerPartnerName && (
                developerPartnerUrl ? (
                  <a href={developerPartnerUrl} target="_blank" rel="noreferrer" className="app-developer">
                    by {app.developerPartnerName}
                    <CheckCircle size={13} />
                  </a>
                ) : (
                  <span className="app-developer">
                    by {app.developerPartnerName}
                    <CheckCircle size={13} />
                  </span>
                )
              )}
              {rating != null && (
                <span className="app-rating-inline">
                  <Star size={13} fill="#f59e0b" color="#f59e0b" />
                  {rating.toFixed(1)}
                  <span className="reviews-count">({reviewTotal.toLocaleString()} reviews)</span>
                </span>
              )}
              {app.appDescription && <span className="app-meta-description">{app.appDescription}</span>}
            </div>
          </div>
        </div>
        <div className="card-actions-top">
          <button
            className={`icon-btn${expanded ? ' active' : ''}`}
            type="button"
            onClick={() => onToggleExpanded(appKey)}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="expanded-content">
          {appImages.length > 0 && (
            <div className="app-gallery">
              {appImages.slice(0, 4).map((img, i) => (
                <button key={`${img}-${i}`} type="button" className="gallery-clickable" onClick={() => onImageOpen(appImages, i)}>
                  <img src={img} alt="" className="gallery-img" />
                  {i === 3 && appImages.length > 4 ? <div className="gallery-more">+{appImages.length - 4}</div> : null}
                </button>
              ))}
            </div>
          )}

          {app.appDescription && (
            <>
              <p className={`app-desc${descExpanded ? ' expanded' : ''}`}>{app.appDescription}</p>
              {app.appDescription.length > 220 && (
                <button className="show-more-btn" type="button" onClick={() => setDescExpanded((e) => !e)}>
                  {descExpanded ? 'Show less' : 'Show more'}
                  {descExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              )}
            </>
          )}

          {(rating != null || breakdownRows.length > 0 || app.usersThinkSummary) && (
            <div className="stats-grid">
              {(rating != null || breakdownRows.length > 0) && (
                <div className="stats-grid-rating-row">
                  {rating != null && (
                    <div className="stat-rating-big">
                      <h4>{rating.toFixed(1)}</h4>
                      <div className="stars-big">
                        <StarRow rating={rating} size={16} />
                      </div>
                      <p>({reviewTotal.toLocaleString()} reviews)</p>
                      {reviewUrl && (
                        <a href={reviewUrl} target="_blank" rel="noreferrer" className="view-reviews">
                          View reviews <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  )}
                  {breakdownRows.length > 0 && (
                    <div className="rating-breakdown">
                      <div className="rating-breakdown-title">Rating breakdown</div>
                      {breakdownRows.map(({ star, count, pct }) => (
                        <div key={star} className="breakdown-row">
                          <span>{star}</span>
                          <Star size={11} fill="#f59e0b" color="#f59e0b" />
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span>
                            {pct}% ({count.toLocaleString()})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {app.usersThinkSummary && (
                <div className="ai-summary">
                  <h5>
                    <ThumbsUp size={13} /> Users think
                  </h5>
                  <p>{app.usersThinkSummary}</p>
                  {reviewTotal > 0 && <span>Based on {reviewTotal.toLocaleString()} reviews</span>}
                  {app.usersThinkIsAiGenerated && (
                    <div className="ai-badge">
                      <Sparkles size={12} /> AI Summary
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {plans.length > 0 && (
            <>
              <div className="pricing-header">
                <h4>Pricing</h4>
                {pricing?.seeAllPricingUrl && (
                  <a href={pricing.seeAllPricingUrl} target="_blank" rel="noreferrer">
                    View all plans &rsaquo;
                  </a>
                )}
              </div>
              <div className="pricing-cards">
                {plans.slice(0, 4).map((plan, i) => (
                  <div key={i} className="price-card">
                    <div className="plan-name">{plan.name ?? '—'}</div>
                    <div className="price">{plan.price ?? 'Free'}</div>
                    {(plan.trialInfo || plan.description) && (
                      <div className="billing">{plan.trialInfo ?? plan.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="app-meta-actions-row">
            <div className="app-meta-details app-meta-details--single">
              {catalogCategories.length > 0 && (
                <div className="meta-item-row">
                  <Calendar size={16} className="meta-icon" />
                  <div className="meta-cnt">
                    <h5>Categories</h5>
                    <div className="category-pills-inline">
                      {catalogCategories.map((c) => (
                        <span key={c} className="small-category-pill">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {app.developerPartnerName && (
                <div className="meta-item-row">
                  <User size={16} className="meta-icon" />
                  <div className="meta-cnt">
                    <h5>Developer</h5>
                    {developerPartnerUrl ? (
                      <a href={developerPartnerUrl} target="_blank" rel="noreferrer">
                        {app.developerPartnerName} <ExternalLink size={11} />
                      </a>
                    ) : (
                      <p>{app.developerPartnerName}</p>
                    )}
                  </div>
                </div>
              )}
              {app.developerWebsite && (
                <div className="meta-item-row">
                  <Globe size={16} className="meta-icon" />
                  <div className="meta-cnt">
                    <h5>Website</h5>
                    <a href={app.developerWebsite} target="_blank" rel="noreferrer">
                      {app.developerWebsite.replace(/^https?:\/\//, '')} <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              )}
              {launchDate && (
                <div className="meta-item-row">
                  <Calendar size={16} className="meta-icon" />
                  <div className="meta-cnt">
                    <h5>Launched</h5>
                    <p>{launchDate}</p>
                  </div>
                </div>
              )}
              {app.developerSupportEmail && (
                <div className="meta-item-row">
                  <MessageCircle size={16} className="meta-icon" />
                  <div className="meta-cnt">
                    <h5>Support</h5>
                    <p>{app.developerSupportEmail}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="card-actions-bottom">
              {viewDemoStoreUrl ? (
                <a href={viewDemoStoreUrl} target="_blank" rel="noreferrer" className="apps-btn-primary">
                  View demo store <ExternalLink size={14} />
                </a>
              ) : (
                <span />
              )}
              {sourceAppUrl ? (
                <a href={sourceAppUrl} target="_blank" rel="noreferrer" className="apps-btn-secondary">
                  View in Shopify App Store <ExternalLink size={14} />
                </a>
              ) : (
                <span />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AppSkeletonCard() {
  return (
    <div className="app-card app-card-skeleton">
      <div className="card-header">
        <div className="card-header-left">
          <div className="apps-skeleton apps-skeleton-icon" />
          <div className="app-info">
            <div className="apps-skeleton apps-skeleton-title" />
            <div className="apps-skeleton apps-skeleton-meta" />
            <div className="apps-skeleton apps-skeleton-desc" />
          </div>
        </div>
        <div className="apps-skeleton apps-skeleton-btn" />
      </div>
    </div>
  )
}

export default function AppsPage({
  storeInfo,
  storeInfoLoaded,
  persistedExpandedAppKey,
  persistedScrollY,
  isActive,
  onPersistAppsState,
}: AppsPageProps) {
  const [pill, setPill] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('rating')
  const [sortOpen, setSortOpen] = useState(false)
  const [expandedAppKey, setExpandedAppKey] = useState('')
  const [galleryModalOpen, setGalleryModalOpen] = useState(false)
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [galleryIndex, setGalleryIndex] = useState(0)
  const sortRef = useRef<HTMLDivElement>(null)
  const didRestoreRef = useRef(false)

  const apps = useMemo(
    () =>
      Object.values(
        ((storeInfo?.appDetectionResult as { apps?: Record<string, unknown> } | null)?.apps ??
          {}) as Record<string, unknown>,
      ) as ShopifyApp[],
    [storeInfo],
  )

  useEffect(() => {
    if (!sortOpen) return
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sortOpen])

  useEffect(() => {
    if (!galleryModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGalleryModalOpen(false)
      if (e.key === 'ArrowLeft') setGalleryIndex((idx) => (idx - 1 + galleryImages.length) % galleryImages.length)
      if (e.key === 'ArrowRight') setGalleryIndex((idx) => (idx + 1) % galleryImages.length)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [galleryModalOpen, galleryImages.length])

  const filtered = useMemo(() => {
    const byPill =
      pill === 'all'
        ? apps
        : apps.filter((a) => getCatalogCategoriesFromJson(a).some((c) => getCategoryId(c) === pill))
    return sortApps(byPill.filter((a) => appMatchesQuery(a, search)), sortKey)
  }, [apps, pill, search, sortKey])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const categoryPills = useMemo(() => {
    const map = new Map<string, number>()
    for (const app of apps) {
      for (const cat of getCatalogCategoriesFromJson(app)) {
        map.set(cat, (map.get(cat) ?? 0) + 1)
      }
    }
    const dynamicPills = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ id: getCategoryId(label), label, count }))
    return [{ id: 'all', label: 'All', count: apps.length }, ...dynamicPills]
  }, [apps])

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4))
    const end = Math.min(totalPages, start + 4)
    const nums: number[] = []
    for (let i = start; i <= end; i += 1) nums.push(i)
    return nums
  }, [safePage, totalPages])

  useEffect(() => {
    if (!isActive || didRestoreRef.current) return
    didRestoreRef.current = true
    if (persistedExpandedAppKey) setExpandedAppKey(persistedExpandedAppKey)
    if (persistedScrollY > 0) {
      requestAnimationFrame(() => window.scrollTo({ top: persistedScrollY, behavior: 'auto' }))
    }
  }, [isActive, persistedExpandedAppKey, persistedScrollY])

  useEffect(() => {
    if (!isActive) return
    if (expandedAppKey && !filtered.some((a) => makeAppKey(a) === expandedAppKey)) {
      setExpandedAppKey('')
      onPersistAppsState({ appsExpandedAppKey: '' })
    }
  }, [expandedAppKey, filtered, isActive, onPersistAppsState])

  useEffect(() => {
    if (!isActive) return
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        onPersistAppsState({ appsScrollY: Math.max(0, Math.floor(window.scrollY)) })
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [isActive, onPersistAppsState])

  const sortLabel = SORT_OPTIONS.find((s) => s.key === sortKey)?.label ?? 'Rating'

  return (
    <>
      <div className="apps-toolbar">
        <div className="apps-search-bar">
          <Search size={16} className="search-icon" aria-hidden />
          <input
            type="search"
            placeholder="Search apps by name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="sort-wrap" ref={sortRef}>
          <button className="apps-btn-outline" type="button" onClick={() => setSortOpen((o) => !o)}>
            Sort: {sortLabel} <ChevronDown size={15} />
          </button>
          {sortOpen && (
            <div className="sort-dropdown">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`sort-option${sortKey === opt.key ? ' active' : ''}`}
                  onClick={() => {
                    setSortKey(opt.key)
                    setSortOpen(false)
                    setPage(1)
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="apps-category-pills">
        {categoryPills.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`pill pill-small${pill === p.id ? ' active' : ''}`}
            onClick={() => {
              setPill(p.id)
              setPage(1)
            }}
          >
            {p.label} ({p.count})
          </button>
        ))}
      </div>

      <div className="apps-results-count">{filtered.length} apps detected</div>

      <div className="apps-cards">
        {!storeInfoLoaded ? (
          Array.from({ length: SKELETON_COUNT }).map((_, i) => <AppSkeletonCard key={`apps-skeleton-${i}`} />)
        ) : paged.length === 0 ? (
          <div className="apps-empty">No apps found for current filters.</div>
        ) : (
          paged.map((app) => {
            const appKey = makeAppKey(app)
            return (
              <AppCard
                key={appKey}
                app={app}
                appKey={appKey}
                expanded={expandedAppKey === appKey}
                onToggleExpanded={(nextKey) => {
                  setExpandedAppKey((prev) => {
                    const out = prev === nextKey ? '' : nextKey
                    onPersistAppsState({ appsExpandedAppKey: out })
                    return out
                  })
                }}
                onImageOpen={(images, startIndex) => {
                  setGalleryImages(images)
                  setGalleryIndex(startIndex)
                  setGalleryModalOpen(true)
                }}
              />
            )
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="apps-pagination">
          <div className="page-numbers">
            <button
              type="button"
              className="page-btn nav"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              <ChevronLeft size={14} />
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                className={`page-btn${n === safePage ? ' active' : ''}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className="page-btn nav"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="apps-per-page-note">{PAGE_SIZE} per page</div>
        </div>
      )}

      {galleryModalOpen && galleryImages.length > 0 && (
        <div className="apps-gallery-modal-backdrop" onClick={() => setGalleryModalOpen(false)} role="presentation">
          <div className="apps-gallery-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button type="button" className="apps-gallery-close" onClick={() => setGalleryModalOpen(false)} aria-label="Close image modal">
              <X size={18} />
            </button>
            <button
              type="button"
              className="apps-gallery-nav apps-gallery-nav--left"
              onClick={() =>
                setGalleryIndex((idx) => (idx - 1 + galleryImages.length) % galleryImages.length)
              }
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <img src={galleryImages[galleryIndex]} alt="" className="apps-gallery-modal-image" />
            <button
              type="button"
              className="apps-gallery-nav apps-gallery-nav--right"
              onClick={() => setGalleryIndex((idx) => (idx + 1) % galleryImages.length)}
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
