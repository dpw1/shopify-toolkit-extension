import { useMemo, useState } from 'react'
import type { CatalogProductRow, StoreInfo } from '../../types'
import type { PageId } from '../components/Nav'
import {
  ArrowUpRight,
  Bug,
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
  Package,
  Palette,
  Puzzle,
  RefreshCw,
  Store,
  Video,
  X,
} from 'lucide-react'
import { emitSpykitSuccess, emitSpykitToast } from '../lib/spykitToastBus'
import './storesTab.css'
import { PaymentBrandIcon } from '../components/PaymentBrandIcon'
import {
  CountryFlag,
  countryCodeOnlyLabel,
  getShipsToCountriesRaw,
  normalizeShipsToCountries,
} from '../components/CountryFlag'
import { ShipsToFlag } from '../components/ShipsToFlag'
import { appendUtmToUrl } from '../lib/appendUtm'
import type { StorefrontEligibility } from '../hooks/useStoreInfo'
import { formatFirstProductPublishedLine, formatStoreAgeSummary } from '../lib/humanStoreAge'
import {
  getShopifyThemeFromHtml,
  loadPopupStoreBundle,
  requestCatalogSyncFromPopup,
  requestCollectionProductsLinkingFromPopup,
  requestFullStoreRefreshFromPopup,
  spykitDebugFetchAllFromActiveTab,
  spykitDebugFetchHtmlFromActiveTab,
  spykitDebugFetchMetaJsonFromActiveTab,
  spykitFetchThemeAndAppsFromHtml,
} from '../lib/popupStoreLoader'
import { syncPopupStoreData } from '../windowStoreData'
import { useSpykitStore } from '../store/useSpykitStore'

/** Shown until the popup receives the first `GET_STORE_INFO` response. */
function StoreTabSkeleton() {
  return (
    <div className="stores-tab stores-tab--skeleton" aria-busy="true" aria-label="Loading store">
      <div className="card store-top-card">
        <div className="store-main-info">
          <div className="store-identity">
            <div className="st-sk st-sk-logo" />
            <div className="st-sk-details">
              <div className="st-sk st-sk-title" />
              <div className="st-sk st-sk-line st-sk-line--md" />
              <div className="st-sk st-sk-line st-sk-line--sm" />
            </div>
          </div>
        </div>
        <div className="store-stats-row">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-box st-sk-stat" style={{ pointerEvents: 'none' }}>
              <div className="st-sk st-sk-line st-sk-line--xs" />
              <div className="st-sk st-sk-value" />
              <div className="st-sk st-sk-line st-sk-line--xs" style={{ width: '48%' }} />
            </div>
          ))}
        </div>
      </div>
      <div className="st-sk st-sk-section-title" />
      <div className="intelligence-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="intel-card col-3 st-sk-intel">
            <div className="st-sk st-sk-line st-sk-line--xs" style={{ marginBottom: 10 }} />
            <div className="st-sk st-sk-value" />
            <div className="st-sk st-sk-line st-sk-line--sm" />
          </div>
        ))}
        <div className="intel-card col-4 st-sk-intel">
          <div className="st-sk st-sk-line st-sk-line--xs" style={{ marginBottom: 10 }} />
          <div className="st-sk st-sk-block" />
        </div>
        <div className="intel-card col-5 st-sk-intel">
          <div className="st-sk st-sk-line st-sk-line--xs" style={{ marginBottom: 10 }} />
          <div className="st-sk st-sk-pay-row" />
        </div>
        <div className="intel-card col-3 st-sk-intel">
          <div className="st-sk st-sk-line st-sk-line--xs" style={{ marginBottom: 10 }} />
          <div className="st-sk st-sk-value" />
          <div className="st-sk st-sk-line st-sk-line--sm" />
        </div>
      </div>
    </div>
  )
}

/** Minimal inline SVG social icons (brand icons not in Lucide). */
function SocialSvg({ platform }: { platform: string }) {
  switch (platform) {
    case 'instagram':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 32 32" fill="currentColor">
          <path d="M10.202,2.098c-1.49,.07-2.507,.308-3.396,.657-.92,.359-1.7,.84-2.477,1.619-.776,.779-1.254,1.56-1.61,2.481-.345,.891-.578,1.909-.644,3.4-.066,1.49-.08,1.97-.073,5.771s.024,4.278,.096,5.772c.071,1.489,.308,2.506,.657,3.396,.359,.92,.84,1.7,1.619,2.477,.779,.776,1.559,1.253,2.483,1.61,.89,.344,1.909,.579,3.399,.644,1.49,.065,1.97,.08,5.771,.073,3.801-.007,4.279-.024,5.773-.095s2.505-.309,3.395-.657c.92-.36,1.701-.84,2.477-1.62s1.254-1.561,1.609-2.483c.345-.89,.579-1.909,.644-3.398,.065-1.494,.081-1.971,.073-5.773s-.024-4.278-.095-5.771-.308-2.507-.657-3.397c-.36-.92-.84-1.7-1.619-2.477s-1.561-1.254-2.483-1.609c-.891-.345-1.909-.58-3.399-.644s-1.97-.081-5.772-.074-4.278,.024-5.771,.096m.164,25.309c-1.365-.059-2.106-.286-2.6-.476-.654-.252-1.12-.557-1.612-1.044s-.795-.955-1.05-1.608c-.192-.494-.423-1.234-.487-2.599-.069-1.475-.084-1.918-.092-5.656s.006-4.18,.071-5.656c.058-1.364,.286-2.106,.476-2.6,.252-.655,.556-1.12,1.044-1.612s.955-.795,1.608-1.05c.493-.193,1.234-.422,2.598-.487,1.476-.07,1.919-.084,5.656-.092,3.737-.008,4.181,.006,5.658,.071,1.364,.059,2.106,.285,2.599,.476,.654,.252,1.12,.555,1.612,1.044s.795,.954,1.051,1.609c.193,.492,.422,1.232,.486,2.597,.07,1.476,.086,1.919,.093,5.656,.007,3.737-.006,4.181-.071,5.656-.06,1.365-.286,2.106-.476,2.601-.252,.654-.556,1.12-1.045,1.612s-.955,.795-1.608,1.05c-.493,.192-1.234,.422-2.597,.487-1.476,.069-1.919,.084-5.657,.092s-4.18-.007-5.656-.071M21.779,8.517c.002,.928,.755,1.679,1.683,1.677s1.679-.755,1.677-1.683c-.002-.928-.755-1.679-1.683-1.677,0,0,0,0,0,0-.928,.002-1.678,.755-1.677,1.683m-12.967,7.496c.008,3.97,3.232,7.182,7.202,7.174s7.183-3.232,7.176-7.202c-.008-3.97-3.233-7.183-7.203-7.175s-7.182,3.233-7.174,7.203m2.522-.005c-.005-2.577,2.08-4.671,4.658-4.676,2.577-.005,4.671,2.08,4.676,4.658,.005,2.577-2.08,4.671-4.658,4.676-2.577,.005-4.671-2.079-4.676-4.656h0"></path>
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
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 32 32" fill="currentColor">
          <path d="M16,2C8.268,2,2,8.268,2,16c0,5.931,3.69,11.001,8.898,13.041-.122-1.108-.233-2.811,.049-4.02,.254-1.093,1.642-6.959,1.642-6.959,0,0-.419-.839-.419-2.079,0-1.947,1.128-3.4,2.533-3.4,1.194,0,1.771,.897,1.771,1.972,0,1.201-.765,2.997-1.16,4.661-.33,1.393,.699,2.53,2.073,2.53,2.488,0,4.401-2.624,4.401-6.411,0-3.352-2.409-5.696-5.848-5.696-3.983,0-6.322,2.988-6.322,6.076,0,1.203,.464,2.494,1.042,3.195,.114,.139,.131,.26,.097,.402-.106,.442-.342,1.393-.389,1.588-.061,.256-.203,.311-.468,.187-1.749-.814-2.842-3.37-2.842-5.424,0-4.416,3.209-8.472,9.25-8.472,4.857,0,8.631,3.461,8.631,8.086,0,4.825-3.042,8.708-7.265,8.708-1.419,0-2.752-.737-3.209-1.608,0,0-.702,2.673-.872,3.328-.316,1.216-1.169,2.74-1.74,3.67,1.31,.406,2.702,.624,4.145,.624,7.732,0,14-6.268,14-14S23.732,2,16,2Z"></path>
        </svg>
      )
    case 'tiktok':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 32 32" fill="currentColor">
          <path d="M24.562,7.613c-1.508-.983-2.597-2.557-2.936-4.391-.073-.396-.114-.804-.114-1.221h-4.814l-.008,19.292c-.081,2.16-1.859,3.894-4.039,3.894-.677,0-1.315-.169-1.877-.465-1.288-.678-2.169-2.028-2.169-3.582,0-2.231,1.815-4.047,4.046-4.047,.417,0,.816,.069,1.194,.187v-4.914c-.391-.053-.788-.087-1.194-.087-4.886,0-8.86,3.975-8.86,8.86,0,2.998,1.498,5.65,3.783,7.254,1.439,1.01,3.19,1.606,5.078,1.606,4.886,0,8.86-3.975,8.86-8.86V11.357c1.888,1.355,4.201,2.154,6.697,2.154v-4.814c-1.345,0-2.597-.4-3.647-1.085Z"></path>
        </svg>
      )
    case 'discord':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path
            d="M18.8943 4.34399C17.5183 3.71467 16.057 3.256 14.5317 3C14.3396 3.33067 14.1263 3.77866 13.977 4.13067C12.3546 3.89599 10.7439 3.89599 9.14391 4.13067C8.99457 3.77866 8.77056 3.33067 8.58922 3C7.05325 3.256 5.59191 3.71467 4.22552 4.34399C1.46286 8.41865 0.716188 12.3973 1.08952 16.3226C2.92418 17.6559 4.69486 18.4666 6.4346 19C6.86126 18.424 7.24527 17.8053 7.57594 17.1546C6.9466 16.92 6.34927 16.632 5.77327 16.2906C5.9226 16.184 6.07194 16.0667 6.21061 15.9493C9.68793 17.5387 13.4543 17.5387 16.889 15.9493C17.0383 16.0667 17.177 16.184 17.3263 16.2906C16.7503 16.632 16.153 16.92 15.5236 17.1546C15.8543 17.8053 16.2383 18.424 16.665 19C18.4036 18.4666 20.185 17.6559 22.01 16.3226C22.4687 11.7787 21.2836 7.83202 18.8943 4.34399ZM8.05593 13.9013C7.01058 13.9013 6.15725 12.952 6.15725 11.7893C6.15725 10.6267 6.98925 9.67731 8.05593 9.67731C9.11191 9.67731 9.97588 10.6267 9.95454 11.7893C9.95454 12.952 9.11191 13.9013 8.05593 13.9013ZM15.065 13.9013C14.0196 13.9013 13.1652 12.952 13.1652 11.7893C13.1652 10.6267 13.9983 9.67731 15.065 9.67731C16.121 9.67731 16.985 10.6267 16.9636 11.7893C16.9636 12.952 16.1317 13.9013 15.065 13.9013Z"
            stroke="currentColor"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'snapchat':
    case 'vimeo':
      return <Video size={15} />
    default:
      return <Globe size={15} />
  }
}

interface OverviewPageProps {
  storefrontEligibility: StorefrontEligibility
  storeInfo: StoreInfo | null
  storeInfoLoaded: boolean
  /** Current IndexedDB catalog lengths (same source as Products tab). */
  catalogProductCount: number
  catalogCollectionCount: number
  /** Product rows from IDB (for age from `published_at`). */
  catalogProducts: CatalogProductRow[]
  /** Pass `scraperView` when opening the Products tab so the correct sub-view shows. */
  onNavigate: (page: PageId, options?: { scraperView?: 'products' | 'collections' }) => void
}

function fmt(n: number) {
  return n.toLocaleString()
}

async function pullSpykitBundleIntoZustand() {
  const bundle = await loadPopupStoreBundle()
  const si = bundle?.storeInfo ?? null
  await syncPopupStoreData(si)
  const p = bundle?.products ?? window.storeData?.products ?? []
  const c = bundle?.collections ?? window.storeData?.collections ?? []
  useSpykitStore.getState().setStoreInfo(si)
  useSpykitStore.getState().setProducts(p)
  useSpykitStore.getState().setCollections(c)
}

function formatRelative(t: number): string {
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  return `${Math.floor(h / 24)} day(s) ago`
}

export default function OverviewPage({
  storefrontEligibility,
  storeInfo,
  storeInfoLoaded,
  catalogProductCount,
  catalogCollectionCount,
  catalogProducts,
  onNavigate,
}: OverviewPageProps) {
  const [copied, setCopied] = useState(false)
  const [reSyncBusy, setReSyncBusy] = useState(false)
  const [debugBusy, setDebugBusy] = useState(false)
  const [shipsToModalOpen, setShipsToModalOpen] = useState(false)
  const [revealAgeRequested, setRevealAgeRequested] = useState(false)
  const [revealAgeBusy, setRevealAgeBusy] = useState(false)
  /** Latest time data was pulled from storefront HTTP (meta.json / catalog), not popup read time. */
  const sourceDataUpdatedAt = Math.max(
    storeInfo?.shopMetaSourceFetchedAt ?? 0,
    storeInfo?.catalogSourceFetchedAt ?? 0,
  )

  async function onReSync() {
    console.log('[SpyKit Popup] Overview Re-sync: clicked')
    setReSyncBusy(true)
    emitSpykitToast('Re-syncing store, theme, apps, and catalog…')
    try {
      const res = await requestFullStoreRefreshFromPopup()
      console.log('[SpyKit Popup] Overview Re-sync: FORCE_REFRESH result', res)
      if (!res.ok) {
        emitSpykitToast(res.error ? `Re-sync failed: ${res.error}` : 'Re-sync failed — try again on the storefront tab.')
        return
      }
      const w = window as unknown as { spykitLoadStore?: () => Promise<unknown> }
      console.log('[SpyKit Popup] Overview Re-sync: calling spykitLoadStore…')
      await w.spykitLoadStore?.()
      console.log('[SpyKit Popup] Overview Re-sync: spykitLoadStore finished')
    } finally {
      setReSyncBusy(false)
    }
  }

  async function onDebugTheme() {
    setDebugBusy(true)
    try {
      const r = await spykitDebugFetchAllFromActiveTab()
      if (!r.ok) {
        emitSpykitToast(`Debug theme failed: ${r.error}`)
        console.warn('[SpyKit Popup] debug: theme failed', r)
        return
      }
      console.log('[SpyKit Popup] debug: theme (page world / Shopify.theme)', {
        domain: r.domain,
        source: r.source,
        theme: r.theme,
        shopifyThemeRaw: r.shopifyThemeRaw,
        appsAlsoDetected: r.apps.length,
      })
      await new Promise((x) => setTimeout(x, 200))
      await pullSpykitBundleIntoZustand()
    } finally {
      setDebugBusy(false)
    }
  }

  async function onDebugApps() {
    setDebugBusy(true)
    try {
      const r = await spykitDebugFetchAllFromActiveTab()
      if (!r.ok) {
        emitSpykitToast(`Debug apps failed: ${r.error}`)
        console.warn('[SpyKit Popup] debug: apps failed', r)
        return
      }
      console.log('[SpyKit Popup] debug: apps (popup-side catalog + DOM snapshot)', {
        domain: r.domain,
        source: r.source,
        apps: r.apps,
        totalDetected: r.apps.length,
        themeAlsoDetected: r.theme?.name,
      })
      await new Promise((x) => setTimeout(x, 200))
      await pullSpykitBundleIntoZustand()
    } finally {
      setDebugBusy(false)
    }
  }

  async function onDebugCollectionProducts() {
    setDebugBusy(true)
    try {
      const r = await requestCollectionProductsLinkingFromPopup()
      if (!r.ok) {
        emitSpykitToast(`Debug collection products failed: ${r.error ?? 'unknown_error'}`)
        console.warn('[SpyKit Popup] debug: collection products failed', r)
        return
      }
      console.log('[SpyKit Popup] debug: collection products linking complete', r)
      await new Promise((x) => setTimeout(x, 200))
      await pullSpykitBundleIntoZustand()
    } finally {
      setDebugBusy(false)
    }
  }

  async function onDebugFetchThemeFromHtml() {
    console.log('[SpyKit Popup] debug: fetch html clicked')
    setDebugBusy(true)
    try {
      const r = await spykitDebugFetchHtmlFromActiveTab()
      console.log('[SpyKit Popup] debug: fetch html result', r)
      if (!r.ok) {
        emitSpykitToast(`Debug fetch html failed: ${r.error}`)
        console.warn('[SpyKit Popup] debug: fetch html failed', r)
        return
      }
      console.log('[SpyKit Popup] debug: fetched html', {
        url: r.url,
        htmlLength: r.html.length,
      })
      console.log(r.html)
      const themeObj = getShopifyThemeFromHtml(r.html)
      console.log('[SpyKit Popup] debug: Shopify.theme parsed from fetched HTML', themeObj)
      emitSpykitSuccess('fetched html')
    } finally {
      setDebugBusy(false)
    }
  }

  async function onDebugFetchAppsFromHtml() {
    console.log('[SpyKit Popup] debug: fetch app/theme/email from html clicked')
    setDebugBusy(true)
    try {
      // Use the exact same official pipeline as popup load:
      // one HTML fetch -> parse theme/apps -> map ShopifyApp[] -> persist snapshot.
      const r = await spykitFetchThemeAndAppsFromHtml()
      console.log('[SpyKit Popup] debug: fetch apps official pipeline result', r)
      if (!r.ok) {
        emitSpykitToast(`Debug fetch apps failed: ${r.error ?? 'unknown_error'}`)
        console.warn('[SpyKit Popup] debug: fetch apps failed (official pipeline)', r)
        return
      }

      await new Promise((x) => setTimeout(x, 150))
      await pullSpykitBundleIntoZustand()

      const zustandAppsObj = (
        useSpykitStore.getState().storeInfo?.appDetectionResult as
          | { apps?: Record<string, unknown> }
          | undefined
      )?.apps
      const zustandApps = Object.values(zustandAppsObj ?? {})
      console.log('[SpyKit Popup] debug: apps persisted to Zustand', {
        domain: r.domain,
        fetchedApps: r.apps,
        fetchedEmails: r.emails ?? [],
        zustandApps,
        fetchedCount: r.apps.length,
        fetchedEmailCount: (r.emails ?? []).length,
        zustandCount: zustandApps.length,
      })
      emitSpykitSuccess('fetched app/theme/email')
    } finally {
      setDebugBusy(false)
    }
  }

  async function onDebugFetchMetaJson() {
    setDebugBusy(true)
    try {
      const r = await spykitDebugFetchMetaJsonFromActiveTab()
      if (!r.ok) {
        emitSpykitToast(`Debug meta.json failed: ${r.error}`)
        console.warn('[SpyKit Popup] debug: meta.json failed', r)
        return
      }
      console.log('[SpyKit Popup] debug: meta.json fetched', {
        url: r.url,
        meta: r.meta,
      })
      emitSpykitSuccess('fetched meta.json')
    } finally {
      setDebugBusy(false)
    }
  }

  const shopMeta  = storeInfo?.shopMeta
  const contacts  = storeInfo?.storeContacts
  const connected = Boolean(storeInfo?.detectedAt && storeInfo?.domain)

  const storeName    = shopMeta?.name?.trim() || storeInfo?.domain || '—'
  const logoLetter   = storeName !== '—' ? storeName[0].toUpperCase() : 'S'
  const myshopifyUrl = shopMeta?.myshopify_domain
    ? `https://${shopMeta.myshopify_domain}`
    : storeInfo?.domain ? `https://${storeInfo.domain}` : null

  const metaProductCount = shopMeta?.published_products_count
  const metaCollectionCount = shopMeta?.published_collections_count
  const hasMetaProductCount = typeof metaProductCount === 'number'
  const hasMetaCollectionCount = typeof metaCollectionCount === 'number'

  const catalogLoading = storeInfo?.catalogLoading === true
  const idbP = catalogProductCount
  const idbC = catalogCollectionCount

  /** Skeleton only while background catalog sync runs and we have neither meta nor IDB rows yet. */
  const productsStatLoading =
    !hasMetaProductCount && idbP === 0 && catalogLoading
  const collectionsStatLoading =
    !hasMetaCollectionCount && idbC === 0 && catalogLoading

  const productCount = hasMetaProductCount
    ? metaProductCount!
    : idbP > 0
      ? idbP
      : (storeInfo?.productCount ?? 0)
  const collectionCount = hasMetaCollectionCount
    ? metaCollectionCount!
    : idbC > 0
      ? idbC
      : (storeInfo?.collectionCount ?? 0)

  const appsCount =
    Object.keys(
      ((storeInfo?.appDetectionResult as { apps?: Record<string, unknown> } | null)?.apps ??
        {}) as Record<string, unknown>,
    ).length

  const locationCity = [shopMeta?.city, shopMeta?.province].filter(Boolean).join(', ') || null
  const locationCountry = shopMeta?.country || null

  /** ISO 4217 code only (e.g. USD), not money format string. */
  const currencyCode = (() => {
    const c = shopMeta?.currency
    if (c == null || c === '') return null
    const s = String(c).trim()
    if (/^[A-Za-z]{3}$/.test(s)) return s.toUpperCase()
    const letters = s.replace(/[^A-Za-z]/g, '')
    if (letters.length >= 3) return letters.slice(0, 3).toUpperCase()
    return s
  })()

  const shipsTo = normalizeShipsToCountries(getShipsToCountriesRaw(shopMeta))

  const cards           = shopMeta?.shopify_pay_enabled_card_brands ?? []
  const shopPayEnabled  = shopMeta?.offers_shop_pay_installments ?? false

  const description = shopMeta?.description?.trim() || null

  const emails = contacts?.emails ?? []
  const email = emails[0] ?? null
  const socialEntries = Object.entries(contacts?.social ?? {})

  /** Earliest `published_at` from IDB catalog (full product list). */
  const estimatedAge = useMemo(() => {
    const products = catalogProducts
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
  }, [catalogProducts])

  async function onRevealEstimatedAge() {
    setRevealAgeRequested(true)
    if (revealAgeBusy) return
    if (estimatedAge && storeInfo?.catalogFullDataInIndexedDb) return

    setRevealAgeBusy(true)
    emitSpykitToast('Fetching products to estimate age…')
    try {
      const syncRes = await requestCatalogSyncFromPopup()
      if (!syncRes.ok) {
        emitSpykitToast(syncRes.error ? `Age reveal failed: ${syncRes.error}` : 'Age reveal failed')
        return
      }

      const startedAt = Date.now()
      const timeoutMs = 20000
      while (Date.now() - startedAt < timeoutMs) {
        const bundle = await loadPopupStoreBundle()
        const info = bundle?.storeInfo
        const done = info?.catalogLoading !== true
        const hasProducts = (bundle?.products?.length ?? 0) > 0
        await pullSpykitBundleIntoZustand()
        if (done && hasProducts) break
        await new Promise((r) => setTimeout(r, 450))
      }
    } finally {
      setRevealAgeBusy(false)
    }
  }

  function copyEmail() {
    if (!emails.length) return
    void navigator.clipboard.writeText(emails.join(', ')).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (storefrontEligibility === 'checking') {
    return <StoreTabSkeleton />
  }

  if (storefrontEligibility === 'ineligible') {
    return (
      <div className="stores-tab">
        <div className="not-connected">
          <Store size={40} />
          <p>This page is not a Shopify storefront.</p>
        </div>
      </div>
    )
  }

  if (!storeInfoLoaded) {
    return <StoreTabSkeleton />
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
                  Shopify detected
                </span>
              </div>
              <div className="store-links">
                {myshopifyUrl && (
                  <a href={appendUtmToUrl(myshopifyUrl)} target="_blank" rel="noreferrer">
                    {shopMeta?.myshopify_domain ?? storeInfo?.domain}
                    <ArrowUpRight size={13} />
                  </a>
                )}
                {emails.length > 0 && (
                  <span className="store-email">
                    {emails.join(', ')}
                    <button
                      className={`copy-btn${copied ? ' copied' : ''}`}
                      title={copied ? 'Copied!' : 'Copy emails'}
                      onClick={copyEmail}
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="store-data-fetch">
            {sourceDataUpdatedAt > 0 && (
              <span className="store-data-fetch-time">
                Updated {formatRelative(sourceDataUpdatedAt)}
              </span>
            )}
            <button
              type="button"
              className="re-scrape"
              disabled={reSyncBusy}
              onClick={() => void onReSync()}
              title="Clear cache and re-fetch meta, theme, apps, contacts, and catalog"
            >
              <RefreshCw size={12} strokeWidth={2} />
              Reload data
            </button>
          </div>
        </div>

        {/* ── Stat boxes ─────────────────────────────────────────────────── */}
        <div className="store-stats-row">
          <div
            className="stat-box stat-box--theme"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('theme')}
          >
            <div className="stat-header">
              <Palette size={14} className="stat-icon purple" />
              Theme
            </div>
            <div className="stat-value">
            { storeInfo?.theme?.name ?? '—'}
            </div>
            <div className="stat-link">Details &rsaquo;</div>
          </div>

          <div
            className="stat-box stat-box--apps"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('apps')}
          >
            <div className="stat-header">
              <Puzzle size={14} className="stat-icon blue" />
              Apps
            </div>
            <div className="stat-value">
              {reSyncBusy ? <span className="stat-value-skeleton" aria-hidden /> : fmt(appsCount)}
            </div>
            <div className="stat-link">View &rsaquo;</div>
          </div>

          <div
            className="stat-box stat-box--products"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('scraper', { scraperView: 'products' })}
          >
            <div className="stat-header">
              <Package size={14} className="stat-icon green" />
              Products
              {catalogLoading && (
                <RefreshCw
                  size={12}
                  strokeWidth={2}
                  className="products-loading-icon"
                  aria-label="Products loading"
                />
              )}
            </div>
            <div className="stat-value">
              {productsStatLoading ? (
                <span className="stat-value-skeleton" aria-hidden />
              ) : (
                fmt(productCount)
              )}
            </div>
            <div className="stat-link">View &rsaquo;</div>
          </div>

          <div
            className="stat-box stat-box--collections"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('scraper', { scraperView: 'collections' })}
          >
            <div className="stat-header">
              <Folder size={14} className="stat-icon orange" />
              Collections
            </div>
            <div className="stat-value">
              {collectionsStatLoading ? (
                <span className="stat-value-skeleton" aria-hidden />
              ) : (
                fmt(collectionCount)
              )}
            </div>
            <div className="stat-link">View &rsaquo;</div>
          </div>
        </div>
      </div>

      {/* ── Store Intelligence ───────────────────────────────────────────── */}
      <p className="section-title">Store Intelligence</p>

      <div className="intelligence-grid">

        {/* Location */}
        <div className="intel-card intel-card--location col-3">
          <div className="intel-header">
            <div className="icon purple"><MapPin size={13} /></div>
            Location
          </div>
          {locationCity && <div className="intel-value intel-value--city">{locationCity}</div>}
          {locationCountry && (
            <div className="intel-sub intel-sub--with-flag intel-sub--country">
              <CountryFlag country={locationCountry} square className="stores-tab-flag" />
              {locationCountry}
            </div>
          )}
          {!locationCity && !locationCountry && (
            <div className="intel-sub intel-sub--location-empty">—</div>
          )}
        </div>

        {/* Currency */}
        <div className="intel-card intel-card--currency col-3">
          <div className="intel-header">
            <div className="icon green"><DollarSign size={13} /></div>
            Currency
          </div>
          <div className="intel-value intel-value--currency">{currencyCode ?? '—'}</div>
        </div>

        {/* Ships To */}
        <div className="intel-card intel-card--ships-to col-3">
          <div className="intel-header">
            <div className="icon blue"><Globe size={13} /></div>
            {shipsTo.length > 0
              ? `Ships to ${shipsTo.length} ${shipsTo.length === 1 ? 'country' : 'countries'}`
              : 'Ships To'}
          </div>
          {shipsTo.length > 0 ? (
            <div className="intel-ships-to-body" style={{ marginTop: 4 }}>
              <div className="ships-to-flags-grid">
                {shipsTo.slice(0, 10).map((code, i) => (
                  <span
                    key={`${i}-${code}`}
                    className="ships-flag-chip"
                    title={countryCodeOnlyLabel(code)}
                  >
                    <ShipsToFlag country={code} className="stores-tab-flag--ships" />
                  </span>
                ))}
              </div>
              {shipsTo.length > 10 && (
                <button
                  type="button"
                  className="ships-more-btn"
                  onClick={() => setShipsToModalOpen(true)}
                  title={`${shipsTo.length} countries total — click to see all`}
                >
                  +{shipsTo.length - 10} more
                </button>
              )}
            </div>
          ) : (
            <div className="intel-sub intel-sub--ships-to-empty" style={{ marginTop: 4 }}>—</div>
          )}
        </div>

        {/* Social Media */}
        <div className="intel-card intel-card--social col-3">
          <div className="intel-header">Social Media</div>
          {socialEntries.length > 0 ? (
            <div className="social-icons-container intel-social-links">
              {socialEntries.map(([platform, href]) => (
                <a
                  key={platform}
                  className="social-icon"
                  href={appendUtmToUrl(href)}
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
            <div className="intel-sub intel-sub--social-empty" style={{ marginTop: 4 }}>Not found yet</div>
          )}
        </div>

        {/* Description */}
        <div className="intel-card intel-card--description col-4">
          <div className="intel-header">
            <div className="icon orange"><FileText size={13} /></div>
            Description
          </div>
          <p className="about-text intel-value--description">{description ?? '—'}</p>
        </div>

        {/* Payment Methods */}
        <div className="intel-card intel-card--payments col-5">
          <div className="intel-header">
            <div className="icon purple"><CreditCard size={13} /></div>
            Payment Methods
          </div>
          {cards.length > 0 ? (
            <div className="payment-methods intel-value--payment-brands">
              {cards.map((card) => (
                <PaymentBrandIcon key={card} brand={card} />
              ))}
            </div>
          ) : (
            <div className="payment-methods intel-value--payment-brands">—</div>
          )}
          <div className="shop-pay-row intel-value--shop-pay">
            Shop Pay Installments
            <span className={`status-badge${shopPayEnabled ? '' : ' disabled'}`}>
              {shopPayEnabled ? <Check size={10} /> : null}
              {shopPayEnabled ? 'Enabled' : 'Unknown'}
            </span>
          </div>
        </div>

        {/* Estimated Age */}
        <div className="intel-card intel-card--estimated-age col-3">
          <div className="intel-header">
            <div className="icon gray"><Clock size={13} /></div>
            Estimated Age
          </div>
          {!revealAgeRequested ? (
            <div className="estimated-age-reveal-row" style={{ marginTop: 6 }}>
              <button
                type="button"
                className="estimated-age-reveal-btn"
                onClick={() => void onRevealEstimatedAge()}
              >
                Reveal
              </button>
              <span className="badge-pro">PRO</span>
            </div>
          ) : revealAgeBusy ? (
            <div className="intel-sub intel-sub--estimated-age-empty" style={{ marginTop: 4 }}>loading</div>
          ) : estimatedAge ? (
            <div className="estimated-age-block">
              <div className="intel-value intel-value--estimated-age" style={{ marginTop: 4 }}>
                {formatStoreAgeSummary(estimatedAge)}
              </div>
              <small className="age-first-published intel-sub--first-published">
                first product published on {formatFirstProductPublishedLine(estimatedAge)}
              </small>
            </div>
          ) : (
            <div className="intel-sub intel-sub--estimated-age-empty" style={{ marginTop: 4 }}>No product publish dates found</div>
          )}
        </div>

      </div>

      <p className="section-title store-debug-section-title">
        <Bug size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
        Debug
      </p>
      <div className="store-debug-panel">
        <p className="store-debug-hint">
          Runs against the last-focused normal window tab (storefront). Results sync to cache and Zustand; details log here.
        </p>
        <div className="store-debug-actions">
          <button
            type="button"
            className="store-debug-btn"
            disabled={debugBusy || reSyncBusy}
            onClick={() => void onDebugTheme()}
            title="Inject / rerun page-world: read window.Shopify.theme → PAGE_DATA → storage"
          >
            Theme
          </button>
          <button
            type="button"
            className="store-debug-btn"
            disabled={debugBusy || reSyncBusy}
            onClick={() => void onDebugApps()}
            title="Content script: fetch apps.json catalog + scan DOM/scripts → merge into PAGE_DATA"
          >
            Apps
          </button>
          <button
            type="button"
            className="store-debug-btn"
            disabled={debugBusy || reSyncBusy}
            onClick={() => void onDebugCollectionProducts()}
            title="Background: fetch per-collection products.json and attach product _collections"
          >
            Collection Products
          </button>
          <button
            type="button"
            className="store-debug-btn"
            disabled={debugBusy || reSyncBusy}
            onClick={() => void onDebugFetchThemeFromHtml()}
            title="Fetches HTML and parses Shopify.theme in popup"
          >
            Fetch Theme
          </button>
          <button
            type="button"
            className="store-debug-btn"
            disabled={debugBusy || reSyncBusy}
            onClick={() => void onDebugFetchAppsFromHtml()}
            title="Fetches HTML once, then parses Shopify.theme, app matches, and emails from it"
          >
            Fetch App/Theme/Email
          </button>
          <button
            type="button"
            className="store-debug-btn"
            disabled={debugBusy || reSyncBusy}
            onClick={() => void onDebugFetchMetaJson()}
            title="Fetches /meta.json from active storefront tab and logs it in popup console"
          >
            meta.json
          </button>
        </div>
      </div>

      {/* Ships To — all-countries modal */}
      {shipsToModalOpen && shipsTo.length > 0 && (
        <div
          className="apps-gallery-modal-backdrop"
          onClick={() => setShipsToModalOpen(false)}
          role="presentation"
        >
          <div
            className="apps-gallery-modal ships-to-all-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="All shipping countries"
          >
            <button
              type="button"
              className="apps-gallery-close"
              onClick={() => setShipsToModalOpen(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className="ships-to-all-modal-inner">
              <p className="ships-to-all-modal-title">
                Ships to {shipsTo.length} {shipsTo.length === 1 ? 'country' : 'countries'}
              </p>
              <div className="ships-to-all-grid">
                {shipsTo.map((code, i) => (
                  <span
                    key={`modal-${i}-${code}`}
                    className="ships-flag-chip ships-flag-chip--modal"
                    title={countryCodeOnlyLabel(code)}
                  >
                    <ShipsToFlag country={code} className="stores-tab-flag--ships" />
                    <span className="ships-flag-chip-label">{countryCodeOnlyLabel(code)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
