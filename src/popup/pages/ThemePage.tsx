import { useEffect, useState } from 'react'
import type { StoreInfo } from '../../types'
import { appendUtmToUrl } from '../lib/appendUtm'
import { getResolvedThemeForUI } from '../lib/themeFromStoreInfo'
import {
  loadThemeWithJsonCatalog,
  type ThemeJsonEntry,
  type ThemeJsonReviews,
} from '../lib/themeJsonCatalog'
import {
  ArrowUpRight,
  FileText,
  LifeBuoy,
  Monitor,
  ShoppingBag,
  Smartphone,
  Star,
  User,
  Users,
} from 'lucide-react'

interface ThemePageProps {
  storeInfo: StoreInfo | null
}

/**
 * Maps positive / neutral / negative to 5 / 3 / 1 stars.
 * If totalReviews exceeds the sentiment sum, the remainder is treated as neutral (3★).
 */
function weightedReviewStars(r: ThemeJsonReviews | undefined): number | null {
  if (!r) return null
  const pos = r.positiveCount ?? 0
  const neu = r.neutralCount ?? 0
  const neg = r.negativeCount ?? 0
  const sum = pos + neu + neg
  const total = r.totalReviews
  if (sum <= 0 && !(typeof total === 'number' && total > 0)) return null
  const labeledScore = 5 * pos + 3 * neu + 1 * neg
  if (typeof total === 'number' && total > sum) {
    const unknownNeutral = total - sum
    return (labeledScore + 3 * unknownNeutral) / total
  }
  if (sum <= 0) return null
  return labeledScore / sum
}

function ThemeDollarIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}


export default function ThemePage({ storeInfo }: ThemePageProps) {
  const t = getResolvedThemeForUI(storeInfo)
  const displayName = t?.name ?? '—'
  const [themeListEntry, setThemeListEntry] = useState<ThemeJsonEntry | null>(null)

  useEffect(() => {
    const ac = new AbortController()
    let cancelled = false
    setThemeListEntry(null)

    void (async () => {
      try {
        const { catalogEntry } = await loadThemeWithJsonCatalog(storeInfo, ac.signal)
        if (!cancelled) setThemeListEntry(catalogEntry)
      } catch {
        if (!cancelled) setThemeListEntry(null)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [storeInfo])

  const themeStoreUrl = themeListEntry?.themeURL ? appendUtmToUrl(themeListEntry.themeURL) : null
  const reviewsUrl = themeListEntry?.themeURL
    ? appendUtmToUrl(themeListEntry.themeURL.replace(/\/$/, '') + '/reviews')
    : null
  const rawLiveDemoUrl =
    themeListEntry?.livedemo ??
    themeListEntry?.liveDemo ??
    themeListEntry?.live_demo ??
    themeListEntry?.demoURL ??
    null
  const liveDemoUrl = rawLiveDemoUrl ? appendUtmToUrl(rawLiveDemoUrl) : null
  const creatorName = themeListEntry?.creator ?? t?.author ?? 'Shopify'
  const reviewsCount = themeListEntry?.reviews?.totalReviews
  const reviewStarRating = weightedReviewStars(themeListEntry?.reviews)
  const heroImageUrl =
    themeListEntry?.desktopImage ?? themeListEntry?.mobileImage ?? themeListEntry?.img ?? null
  const themePriceLine = themeListEntry?.price ?? themeListEntry?.themePrice ?? null
  const versionPrefix = t ? `Version ${t.version || '—'}` : null
  const renamedValue = t?.themeRenamed && t.themeRenamed !== t.name ? t.themeRenamed : null

  return (
    <>
      <div className="theme-layout">
        <div className="theme-info-middle">
          <div style={{ marginBottom: 12 }}>
            <span
              className="tag"
              style={{
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'inline-flex',
              }}
            >
              Live theme
            </span>
          </div>
          <div className="theme-info-header">
            <h2>{displayName}</h2>
            <p className="flex-center" style={{ color: 'var(--text-main)', fontWeight: 500, marginBottom: 16 }}>
              <ShoppingBag size={16} color="var(--success)" strokeWidth={2} aria-hidden />
              by {creatorName}
            </p>
            <p style={{ marginBottom: 16 }}>
              {versionPrefix ?? 'Open a Shopify storefront to load theme details.'}
              {renamedValue && (
                <> &bull; Renamed: <strong>{renamedValue}</strong></>
              )}
            </p>
            <a
              href={themeStoreUrl ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="theme-link flex-center"
              onClick={(e) => {
                if (!themeStoreUrl) e.preventDefault()
              }}
            >
              View on Shopify Theme Store
              <ArrowUpRight size={16} strokeWidth={2} aria-hidden />
            </a>
          </div>
        </div>

        <div className="theme-side-cards">
          <div className="side-card">
            <div className="side-card-icon purple">
              <Users size={20} strokeWidth={2} aria-hidden />
            </div>
            <div>
              {reviewStarRating != null ? (
                <div className="theme-single-star-row">
                  <Star size={14} fill="#f59e0b" color="#f59e0b" aria-hidden />
                  <span className="theme-single-star-rating">{reviewStarRating.toFixed(1)}</span>
                  {typeof reviewsCount === 'number' ? (
                    reviewsUrl ? (
                      <a
                        href={reviewsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="theme-single-star-count theme-reviews-link"
                      >
                        ({reviewsCount.toLocaleString()} reviews)
                      </a>
                    ) : (
                      <span className="theme-single-star-count">
                        ({reviewsCount.toLocaleString()} reviews)
                      </span>
                    )
                  ) : null}
                </div>
              ) : (
                <h4>—</h4>
              )}
            </div>
          </div>
          <div className="side-card">
            <div className="side-card-icon amber">
              <ThemeDollarIcon size={20} />
            </div>
            <div>
              <h4>{themePriceLine ?? '—'}</h4>
              <p>Theme price</p>
            </div>
          </div>
        </div>
      </div>

      <div className="theme-meta-grid">
        <div className="meta-item meta-item-author">
          <span className="meta-label">
            <User size={14} strokeWidth={2} aria-hidden />
            Author
          </span>
          <span className="meta-value">{themeListEntry?.creator ?? '—'}</span>
        </div>
        <div className="meta-item meta-item-description">
          <span className="meta-label">
            <FileText size={14} strokeWidth={2} aria-hidden />
            Description
          </span>
          <small className="meta-value">{themeListEntry?.description ?? '—'}</small>
        </div>
        <div className="meta-item meta-item-demo">
          <span className="meta-label">
            <LifeBuoy size={14} strokeWidth={2} aria-hidden />
            Demo
          </span>
          <a
            href={liveDemoUrl ?? '#'}
            target="_blank"
            rel="noreferrer"
            className="theme-link flex-center"
            style={{ fontSize: 'var(--text-sm)' }}
            onClick={(e) => {
              if (!liveDemoUrl) e.preventDefault()
            }}
          >
            Live demo
            <ArrowUpRight size={14} strokeWidth={2} aria-hidden />
          </a>
        </div>
      </div>

      {(heroImageUrl || themeListEntry?.mobileImage) && (
        <div className="theme-previews-card card">
          {heroImageUrl && (
            <div className="theme-preview-item">
              <div className="theme-preview-label">
                <Monitor size={13} strokeWidth={2} aria-hidden />
                Desktop
              </div>
              <div className="theme-preview-frame theme-preview-frame--desktop">
                <img src={heroImageUrl} alt="Desktop preview" className="theme-preview-img" />
              </div>
            </div>
          )}
          {themeListEntry?.mobileImage && (
            <div className="theme-preview-item">
              <div className="theme-preview-label">
                <Smartphone size={13} strokeWidth={2} aria-hidden />
                Mobile
              </div>
              <div className="theme-preview-frame theme-preview-frame--mobile">
                <img src={themeListEntry.mobileImage} alt="Mobile preview" className="theme-preview-img" />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
