import { useEffect, useState } from 'react'
import type { StoreInfo } from '../../types'
import { appendUtmToUrl } from '../lib/appendUtm'
import { getResolvedThemeForUI } from '../lib/themeFromStoreInfo'
import {
  ArrowUpRight,
  FileText,
  LifeBuoy,
  Monitor,
  Pencil,
  ShoppingBag,
  Smartphone,
  Star,
  User,
  Users,
} from 'lucide-react'

interface ThemePageProps {
  storeInfo: StoreInfo | null
}

type ThemeJsonReviews = {
  totalReviews?: number
  positiveCount?: number
  neutralCount?: number
  negativeCount?: number
  reviewURL?: string
}

type ThemeJsonEntry = {
  themeURL?: string
  title?: string
  price?: string
  description?: string
  creator?: string
  livedemo?: string
  liveDemo?: string
  live_demo?: string
  demoURL?: string
  desktopImage?: string
  mobileImage?: string
  fetch_date?: string
  reviews?: ThemeJsonReviews
  /** legacy keys */
  themeName?: string
  themePrice?: string
  img?: string
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

function ThemeSentimentStars({ rating }: { rating: number }) {
  const clamped = Math.min(5, Math.max(0, rating))
  return (
    <div className="theme-sentiment-stars" role="img" aria-label={`${clamped.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.min(1, Math.max(0, clamped - i))
        return (
          <span key={i} className="theme-star-cell" aria-hidden>
            <Star size={14} strokeWidth={2} className="theme-star-outline" />
            <span className="theme-star-fill-wrap" style={{ width: `${fill * 100}%` }}>
              <Star size={14} strokeWidth={2} fill="currentColor" />
            </span>
          </span>
        )
      })}
      <span className="theme-star-num">{clamped.toFixed(1)}</span>
    </div>
  )
}

function normName(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function resolveVersionedThemesJsonUrl(domain: string, themeId: number): Promise<string | null> {
  void domain
  void themeId
  return 'https://pandatests.myshopify.com/cdn/shop/t/40/assets/themes.json'
}

export default function ThemePage({ storeInfo }: ThemePageProps) {
  const t = getResolvedThemeForUI(storeInfo)
  const displayName = t?.name ?? '—'
  const domain = storeInfo?.domain?.replace(/^https?:\/\//, '') ?? ''
  const themeId = t?.themeId ?? (typeof storeInfo?.shopifyThemeRaw?.id === 'number' ? storeInfo.shopifyThemeRaw.id : null)
  const [themeListEntry, setThemeListEntry] = useState<ThemeJsonEntry | null>(null)

  useEffect(() => {
    let cancelled = false
    setThemeListEntry(null)
    if (!domain || !themeId) return

    void (async () => {
      try {
        const url = await resolveVersionedThemesJsonUrl(domain, themeId)
        if (!url) {
          console.log('[SpyKit Theme] themes.json URL not found (requires ?v= asset URL)')
          return
        }
        const res = await fetch(url, { credentials: 'omit' })
        if (!res.ok) return
        const data = (await res.json()) as Record<string, ThemeJsonEntry>
        const candidates = [
          displayName,
          t?.schemaName ?? '',
          t?.themeRenamed ?? '',
        ]
          .map(normName)
          .filter(Boolean)
        let picked: ThemeJsonEntry | null = null
        for (const [key, value] of Object.entries(data)) {
          const k = normName(key)
          const title = normName(value.title ?? value.themeName ?? '')
          if (candidates.includes(k) || (title && candidates.includes(title))) {
            picked = value
            break
          }
        }
        if (!picked) {
          const byKey = data[displayName] ?? data[t?.schemaName ?? ''] ?? data[t?.themeRenamed ?? '']
          if (byKey) picked = byKey
        }
        console.log('[SpyKit Theme] matched theme from themes.json:', {
          domain,
          themeId,
          themesJsonUrl: url,
          displayName,
          matched: picked ?? null,
        })
        if (!cancelled) setThemeListEntry(picked ?? null)
      } catch {
        /* silent */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [domain, themeId, displayName, t?.schemaName, t?.themeRenamed])

  const themeStoreUrl = themeListEntry?.themeURL ? appendUtmToUrl(themeListEntry.themeURL) : null
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
  const versionLine = t
    ? `Version ${t.version || '—'}${t.themeRenamed && t.themeRenamed !== t.name ? ` \u2022 Renamed: ${t.themeRenamed}` : ''}`
    : 'Open a Shopify storefront to load theme details.'

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
            <h2>
              {displayName}
              <Pencil size={16} color="var(--text-muted)" strokeWidth={2} style={{ cursor: 'pointer' }} aria-hidden />
            </h2>
            <p className="flex-center" style={{ color: 'var(--text-main)', fontWeight: 500, marginBottom: 16 }}>
              <ShoppingBag size={16} color="var(--success)" strokeWidth={2} aria-hidden />
              by {creatorName}
            </p>
            <p style={{ marginBottom: 16 }}>{versionLine}</p>
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
              <h4>{typeof reviewsCount === 'number' ? String(reviewsCount) : '—'}</h4>
              {reviewStarRating != null ? <ThemeSentimentStars rating={reviewStarRating} /> : null}
              <p>Reviews</p>
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
