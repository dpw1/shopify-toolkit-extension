import { useMemo, useState } from 'react'
import type { StoreInfo } from '../../types'
import type { PageId } from '../components/Nav'
import {
  ArrowUpRight,
  Check,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  FileText,
  Folder,
  Globe,
  Mail,
  MapPin,
  Music2,
  Package,
  Palette,
  Puzzle,
  Store,
  Video,
} from 'lucide-react'
import './storesTab.css'

/** Minimal inline SVG social icons (brand icons not in Lucide). */
function SocialSvg({ platform }: { platform: string }) {
  switch (platform) {
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <circle cx="12" cy="12" r="4"/>
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
        </svg>
      )
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
        </svg>
      )
    case 'twitter':
    case 'x':
      return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
        </svg>
      )
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58a2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
          <polygon fill="currentColor" stroke="none" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
        </svg>
      )
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
          <rect x="2" y="9" width="4" height="12"/>
          <circle cx="4" cy="4" r="2"/>
        </svg>
      )
    case 'pinterest':
      return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.65 7.86 6.39 9.29-.09-.78-.17-1.98.03-2.83.19-.78 1.26-5.33 1.26-5.33s-.32-.64-.32-1.59c0-1.49.86-2.6 1.93-2.6.91 0 1.35.68 1.35 1.5 0 .91-.58 2.28-.88 3.55-.25 1.06.52 1.92 1.56 1.92 1.87 0 3.13-2.4 3.13-5.24 0-2.16-1.46-3.77-4.09-3.77-2.98 0-4.83 2.23-4.83 4.72 0 .86.25 1.46.64 1.93.18.21.2.29.14.53-.04.18-.15.6-.19.77-.06.24-.25.33-.46.24-1.28-.52-1.88-1.93-1.88-3.5 0-2.6 2.2-5.72 6.56-5.72 3.52 0 5.85 2.56 5.85 5.31 0 3.65-2.02 6.38-5 6.38-.99 0-1.93-.53-2.25-1.13l-.65 2.52c-.23.9-.87 2.02-1.3 2.7.98.3 2.01.46 3.08.46 5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
        </svg>
      )
    case 'tiktok':
      return <Music2 size={15} />
    case 'snapchat':
    case 'vimeo':
      return <Video size={15} />
    default:
      return <Globe size={15} />
  }
}

interface OverviewPageProps {
  storeInfo: StoreInfo | null
  /** Pass `scraperView` when opening the Products tab so the correct sub-view shows. */
  onNavigate: (page: PageId, options?: { scraperView?: 'products' | 'collections' }) => void
}

function fmt(n: number) {
  return n.toLocaleString()
}

/** Convert a 2-letter ISO country code → emoji flag. */
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return ''
  const base = 0x1f1e6 - 65
  return String.fromCodePoint(
    code.toUpperCase().charCodeAt(0) + base,
    code.toUpperCase().charCodeAt(1) + base,
  )
}

/** Return "X days ago" label + formatted date string from a Date. */
function ageLabel(d: Date): { days: string; formatted: string } {
  const ms = Date.now() - d.getTime()
  const days = Math.floor(ms / 86_400_000)
  const formatted = d.toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return { days: `${days} days ago`, formatted }
}


const CARD_DISPLAY: Record<string, { label: string; cls: string }> = {
  visa:              { label: 'VISA',     cls: 'visa' },
  master:            { label: 'MC',       cls: 'mc' },
  american_express:  { label: 'AMEX',     cls: 'amex' },
  discover:          { label: 'DISCOVER', cls: 'discover' },
  diners_club:       { label: 'DINERS',   cls: 'diners' },
  jcb:               { label: 'JCB',      cls: 'jcb' },
}

export default function OverviewPage({ storeInfo, onNavigate }: OverviewPageProps) {
  const [copied, setCopied] = useState(false)

  const shopMeta  = storeInfo?.shopMeta
  const contacts  = storeInfo?.storeContacts
  const connected = Boolean(storeInfo?.detectedAt && storeInfo?.domain)

  const storeName    = shopMeta?.name?.trim() || storeInfo?.domain || '—'
  const logoLetter   = storeName !== '—' ? storeName[0].toUpperCase() : 'S'
  const myshopifyUrl = shopMeta?.myshopify_domain
    ? `https://${shopMeta.myshopify_domain}`
    : storeInfo?.domain ? `https://${storeInfo.domain}` : null

  const productCount    = shopMeta?.published_products_count    ?? storeInfo?.productCount    ?? 0
  const collectionCount = shopMeta?.published_collections_count ?? storeInfo?.collectionCount ?? 0
  const themeName       = storeInfo?.theme?.name ?? '—'
  const appsCount       = storeInfo?.apps?.length ?? 0

  const locationCity = [shopMeta?.city, shopMeta?.province].filter(Boolean).join(', ') || null
  const locationCountry = shopMeta?.country || null

  const currency    = shopMeta?.currency || null
  const moneyFormat = shopMeta?.money_format?.replace(/<[^>]+>/g, '').trim() || null

  const shipsTo = shopMeta?.ships_to_countries ?? []

  const cards           = shopMeta?.shopify_pay_enabled_card_brands ?? []
  const shopPayEnabled  = shopMeta?.offers_shop_pay_installments ?? false

  const description = shopMeta?.description?.trim() || null

  const email         = contacts?.emails?.[0] || null
  const socialEntries = Object.entries(contacts?.social ?? {})

  /** Find the earliest published_at from the product sample for "store age" estimate. */
  const estimatedAge = useMemo(() => {
    const products = storeInfo?.productsSample
    if (!products?.length) return null
    let earliest: Date | null = null
    for (const p of products) {
      const pa = (p as Record<string, unknown>).published_at
      if (typeof pa === 'string' && pa) {
        const d = new Date(pa)
        if (!isNaN(d.getTime()) && (!earliest || d < earliest)) earliest = d
      }
    }
    return earliest
  }, [storeInfo?.productsSample])

  function copyEmail() {
    if (!email) return
    void navigator.clipboard.writeText(email).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!connected) {
    return (
      <div className="stores-tab">
        <div className="not-connected">
          <Store size={40} />
          <p>Open a Shopify store to see its details here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="stores-tab">
      {/* ── Top card ─────────────────────────────────────────────────────── */}
      <div className="card store-top-card">
        <div className="store-main-info">
          <div className="store-identity">
            <div className="store-logo">{logoLetter}</div>
            <div className="store-details">
              <div className="store-title-row">
                <h2>{storeName}</h2>
                <span className="badge-active">
                  <span className="dot" />
                  Active
                </span>
              </div>
              <div className="store-links">
                {myshopifyUrl && (
                  <a href={myshopifyUrl} target="_blank" rel="noreferrer">
                    {shopMeta?.myshopify_domain ?? storeInfo?.domain}
                    <ArrowUpRight size={13} />
                  </a>
                )}
                {email && (
                  <span className="store-email">
                    {email}
                    <button
                      className={`copy-btn${copied ? ' copied' : ''}`}
                      title={copied ? 'Copied!' : 'Copy email'}
                      onClick={copyEmail}
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Stat boxes ─────────────────────────────────────────────────── */}
        <div className="store-stats-row">
          <div
            className="stat-box"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('theme')}
          >
            <div className="stat-header">
              <Palette size={14} className="stat-icon purple" />
              Theme
            </div>
            <div className="stat-value">{themeName}</div>
            <div className="stat-link">Details &rsaquo;</div>
          </div>

          <div
            className="stat-box"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('apps')}
          >
            <div className="stat-header">
              <Puzzle size={14} className="stat-icon blue" />
              Apps
            </div>
            <div className="stat-value">{fmt(appsCount)}</div>
            <div className="stat-link">View &rsaquo;</div>
          </div>

          <div
            className="stat-box"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('scraper', { scraperView: 'products' })}
          >
            <div className="stat-header">
              <Package size={14} className="stat-icon green" />
              Products
            </div>
            <div className="stat-value">{fmt(productCount)}</div>
            <div className="stat-link">View &rsaquo;</div>
          </div>

          <div
            className="stat-box"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('scraper', { scraperView: 'collections' })}
          >
            <div className="stat-header">
              <Folder size={14} className="stat-icon orange" />
              Collections
            </div>
            <div className="stat-value">{fmt(collectionCount)}</div>
            <div className="stat-link">View &rsaquo;</div>
          </div>
        </div>
      </div>

      {/* ── Store Intelligence ───────────────────────────────────────────── */}
      <p className="section-title">Store Intelligence</p>

      <div className="intelligence-grid">

        {/* Location */}
        <div className="intel-card col-3">
          <div className="intel-header">
            <div className="icon purple"><MapPin size={13} /></div>
            Location
          </div>
          {locationCity && <div className="intel-value">{locationCity}</div>}
          {locationCountry && (
            <div className="intel-sub">
              {locationCountry}
              {' '}<span className="flag">{countryFlag(locationCountry)}</span>
            </div>
          )}
          {!locationCity && !locationCountry && (
            <div className="intel-sub">—</div>
          )}
        </div>

        {/* Currency */}
        <div className="intel-card col-3">
          <div className="intel-header">
            <div className="icon green"><DollarSign size={13} /></div>
            Currency
          </div>
          <div className="intel-value">{currency ?? '—'}</div>
          {moneyFormat && <div className="intel-sub">{moneyFormat}</div>}
        </div>

        {/* Ships To */}
        <div className="intel-card col-3">
          <div className="intel-header">
            <div className="icon blue"><Globe size={13} /></div>
            Ships To
          </div>
          {shipsTo.length > 0 ? (
            <div className="intel-sub" style={{ marginTop: 4 }}>
              {shipsTo.slice(0, 6).map((code) => (
                <span key={code} className="ships-chip">
                  <span className="flag">{countryFlag(code)}</span>
                  {code}
                </span>
              ))}
              {shipsTo.length > 6 && (
                <span className="ships-chip">+{shipsTo.length - 6}</span>
              )}
            </div>
          ) : (
            <div className="intel-sub" style={{ marginTop: 4 }}>—</div>
          )}
        </div>

        {/* Social Media */}
        <div className="intel-card col-3">
          <div className="intel-header">Social Media</div>
          {socialEntries.length > 0 ? (
            <div className="social-icons-container">
              {socialEntries.map(([platform, href]) => (
                <a
                  key={platform}
                  className="social-icon"
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  title={platform.charAt(0).toUpperCase() + platform.slice(1)}
                >
                  <SocialSvg platform={platform} />
                </a>
              ))}
              {email && (
                <a
                  className="social-icon"
                  href={`mailto:${email}`}
                  title="Email"
                >
                  <Mail size={15} />
                </a>
              )}
            </div>
          ) : (
            <div className="intel-sub" style={{ marginTop: 4 }}>Not found yet</div>
          )}
        </div>

        {/* About */}
        <div className="intel-card col-4">
          <div className="intel-header">
            <div className="icon orange"><FileText size={13} /></div>
            About
          </div>
          <p className="about-text">{description ?? '—'}</p>
        </div>

        {/* Payment Methods */}
        <div className="intel-card col-5">
          <div className="intel-header">
            <div className="icon purple"><CreditCard size={13} /></div>
            Payment Methods
          </div>
          {cards.length > 0 ? (
            <div className="payment-methods">
              {cards.map((card) => {
                const info = CARD_DISPLAY[card]
                if (!info) return <span key={card} className="pay-badge">{card.toUpperCase()}</span>
                if (info.cls === 'mc') {
                  return (
                    <div key={card} className="pay-badge mc">
                      <div className="mc-circle mc-red" />
                      <div className="mc-circle mc-orange" />
                    </div>
                  )
                }
                return (
                  <div key={card} className={`pay-badge ${info.cls}`}>{info.label}</div>
                )
              })}
            </div>
          ) : (
            <div className="payment-methods">—</div>
          )}
          <div className="shop-pay-row">
            Shop Pay Installments
            <span className={`status-badge${shopPayEnabled ? '' : ' disabled'}`}>
              {shopPayEnabled ? <Check size={10} /> : null}
              {shopPayEnabled ? 'Enabled' : 'Unknown'}
            </span>
          </div>
        </div>

        {/* Estimated Age */}
        <div className="intel-card col-3">
          <div className="intel-header">
            <div className="icon gray"><Clock size={13} /></div>
            Estimated Age
          </div>
          {estimatedAge ? (
            <>
           
              <div className="intel-value">{ageLabel(estimatedAge).days}</div>
              <div className="age-sub">{ageLabel(estimatedAge).formatted}</div>
            </>
          ) : (
            <div className="intel-sub" style={{ marginTop: 4 }}>—</div>
          )}
        </div>

      </div>
    </div>
  )
}
