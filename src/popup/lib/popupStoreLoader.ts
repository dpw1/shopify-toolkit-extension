/**
 * Central orchestration for popup store data:
 *  1. Resolve canonical shop domain in the active tab (`Shopify.shop` → `/meta.json` → hostname).
 *  2. Load lightweight metadata via background (`GET_STORE_INFO`).
 *  3. Load heavy catalog rows from IndexedDB (`by_domain`).
 *  4. If nothing is cached yet, ask the background to run a full catalog sync.
 *
 * `window.storeData` is updated from `useStoreInfo` via `syncPopupStoreData`, which
 * reads the **IndexedDB** catalog for `storeInfo.domain` (not only the in-memory sample).
 * whenever the merged `StoreInfo` changes.
 */

import type {
  CatalogCollectionRow,
  CatalogProductRow,
  ExtMessage,
  ShopMetaJson,
  ShopifyApp,
  ShopifyTheme,
  StoreContacts,
  StoreInfo,
} from '../../types'
import { extractShopifyThemeMainWorld } from '../../lib/injected/extractShopifyThemeMainWorld'
import { resolveShopDomainInPage } from '../../lib/injected/resolveShopDomain'
import { normalizeStoreDomainKey } from '../../lib/storeDomain'
import { dbGetByDomain, STORE_COLLECTIONS, STORE_PRODUCTS } from '../../lib/db'
import { emitSpykitToast } from './spykitToastBus'
import { APPS_CATALOG_JSON_URL } from '../../config/appsCatalog'

const RESOLVE_RETRY_MS = [0, 150, 350]

const SHOPIFY_THEME_PROBE_MS = [0, 200, 500]

/** Last-focused normal browser window (extension popup is a separate window). */
async function getLastFocusedHttpTab(): Promise<chrome.tabs.Tab | null> {
  try {
    const w = await chrome.windows.getLastFocused({ populate: true, windowTypes: ['normal'] })
    const t = w.tabs?.find((x) => x.active)
    if (t?.id && t.url) {
      try {
        const u = new URL(t.url)
        if (u.protocol === 'http:' || u.protocol === 'https:') return t
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  const [fallback] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  return fallback ?? null
}

/**
 * Returns true only when the **page** main world exposes a Shopify theme object
 * (`window.Shopify.theme`). Uses `world: 'MAIN'` so this matches real storefront JS.
 * Retries briefly so the popup can open before `Shopify` finishes booting.
 */
export async function checkActiveTabHasShopifyTheme(): Promise<boolean> {
  try {
    const tab = await getLastFocusedHttpTab()
    if (!tab?.id || !tab.url) return false
    try {
      const u = new URL(tab.url)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    } catch {
      return false
    }

    for (const delay of SHOPIFY_THEME_PROBE_MS) {
      if (delay) await new Promise((r) => setTimeout(r, delay))
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: 'MAIN',
          func: () => {
            try {
              const t = (window as unknown as { Shopify?: { theme?: unknown } }).Shopify?.theme
              return t != null && typeof t === 'object'
            } catch {
              return false
            }
          },
        })
        if (results[0]?.result === true) return true
      } catch {
        /* not injectable yet or restricted URL — try next delay */
      }
    }
    return false
  } catch {
    return false
  }
}

/**
 * Popup → Background trigger for the on-demand Shopify scan.
 * Background forwards it to the active tab content script and relays status.
 * Uses `lastFocusedWindow` (same as theme probe / domain resolve) so the tab
 * behind the popup is always the one scanned — `currentWindow` can mis-resolve
 * from the extension UI in some cases.
 */
export function requestContentShopScanFromPopup(): Promise<{ ok?: boolean; error?: string }> {
  return new Promise((resolve) => {
    void (async () => {
      try {
        console.log('[SpyKit Popup] starting app detection...')
        const tab = await getLastFocusedHttpTab()
        const tabId = tab?.id
        if (tabId == null) {
          resolve({ ok: false, error: 'no_active_tab' })
          return
        }
        chrome.runtime.sendMessage(
          {
            type: 'SPYKIT_RUN_SHOP_SCAN',
            from: 'popup',
            payload: { tabId },
          } satisfies ExtMessage,
          (res: unknown) => {
            if (chrome.runtime.lastError) {
              resolve({ ok: false, error: chrome.runtime.lastError.message })
              return
            }
            const r = res as { ok?: boolean; result?: unknown; error?: string } | undefined
            if (r?.ok) {
              console.log('[SpyKit Popup] app-standalone result', {
                hasResult: r.result != null,
                result: r.result ?? null,
              })
            } else if (r?.error) {
              const expectedNoReceiver = r.error.toLowerCase().includes('receiving end does not exist')
              if (!expectedNoReceiver) {
                console.warn('[SpyKit Popup] SPYKIT_RUN_SHOP_SCAN error:', r.error)
              }
            }
            resolve(r ?? { ok: false, error: 'no_response' })
          },
        )
      } catch (e) {
        resolve({ ok: false, error: String(e) })
      }
    })()
  })
}

/**
 * Full re-sync for the shop in the **active** storefront tab: purge IDB catalog +
 * `storeCacheByDomain` for that domain, run content `SPYKIT_FORCE_REFRESH` (meta.json,
 * theme via page-world, apps, contacts), then background catalog pagination.
 * Same path as Settings → “Refresh this store”.
 */
export function requestFullStoreRefreshFromPopup(): Promise<{ ok?: boolean; error?: string }> {
  console.log('[SpyKit Popup] requestFullStoreRefreshFromPopup → FORCE_REFRESH_STORE')
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: 'FORCE_REFRESH_STORE', from: 'popup' } satisfies ExtMessage,
        (r: unknown) => {
          if (chrome.runtime.lastError) {
            console.warn('[SpyKit Popup] FORCE_REFRESH_STORE lastError', chrome.runtime.lastError.message)
            resolve({ ok: false, error: chrome.runtime.lastError.message })
            return
          }
          const out = (r as { ok?: boolean; error?: string }) ?? { ok: false }
          console.log('[SpyKit Popup] FORCE_REFRESH_STORE response', out)
          resolve(out)
        },
      )
    } catch (e) {
      console.warn('[SpyKit Popup] FORCE_REFRESH_STORE throw', e)
      resolve({ ok: false, error: String(e) })
    }
  })
}

/** Trigger background catalog sync for the active storefront tab. */
export function requestCatalogSyncFromPopup(): Promise<{ ok?: boolean; error?: string }> {
  console.log('[SpyKit Popup] requestCatalogSyncFromPopup → SYNC_CATALOG_ON_POPUP')
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: 'SYNC_CATALOG_ON_POPUP', from: 'popup' } satisfies ExtMessage,
        (r: unknown) => {
          if (chrome.runtime.lastError) {
            console.warn('[SpyKit Popup] SYNC_CATALOG_ON_POPUP lastError', chrome.runtime.lastError.message)
            resolve({ ok: false, error: chrome.runtime.lastError.message })
            return
          }
          const out = (r as { ok?: boolean; error?: string }) ?? { ok: false }
          resolve(out)
        },
      )
    } catch (e) {
      console.warn('[SpyKit Popup] SYNC_CATALOG_ON_POPUP throw', e)
      resolve({ ok: false, error: String(e) })
    }
  })
}

/** Debug-only: run collection products linking (`/collections/{handle}/products.json`) on demand. */
export function requestCollectionProductsLinkingFromPopup(): Promise<{ ok?: boolean; error?: string }> {
  console.log('[SpyKit Popup] requestCollectionProductsLinkingFromPopup → SPYKIT_DEBUG_LINK_COLLECTION_PRODUCTS')
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: 'SPYKIT_DEBUG_LINK_COLLECTION_PRODUCTS', from: 'popup' } satisfies ExtMessage,
        (r: unknown) => {
          if (chrome.runtime.lastError) {
            console.warn('[SpyKit Popup] SPYKIT_DEBUG_LINK_COLLECTION_PRODUCTS lastError', chrome.runtime.lastError.message)
            resolve({ ok: false, error: chrome.runtime.lastError.message })
            return
          }
          const out = (r as { ok?: boolean; error?: string }) ?? { ok: false }
          console.log('[SpyKit Popup] SPYKIT_DEBUG_LINK_COLLECTION_PRODUCTS response', out)
          resolve(out)
        },
      )
    } catch (e) {
      console.warn('[SpyKit Popup] SPYKIT_DEBUG_LINK_COLLECTION_PRODUCTS throw', e)
      resolve({ ok: false, error: String(e) })
    }
  })
}

// ─── Step 1: domain ───────────────────────────────────────────────────────────

/**
 * Runs in the storefront tab: `Shopify.shop` → `/meta.json` → hostname.
 * Retries a few times because the popup can open before `window.Shopify` exists.
 */
export async function resolveActiveTabShopDomain(): Promise<string | null> {
  try {
    const tab = await getLastFocusedHttpTab()
    if (!tab?.id || !tab.url) return null
    try {
      const u = new URL(tab.url)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    } catch {
      return null
    }

    for (const delay of RESOLVE_RETRY_MS) {
      if (delay) await new Promise((r) => setTimeout(r, delay))
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: resolveShopDomainInPage,
        })
        const v = results[0]?.result
        if (typeof v === 'string' && v.trim()) return normalizeStoreDomainKey(v)
      } catch {
        /* not injectable */
      }
    }

    try {
      return normalizeStoreDomainKey(new URL(tab.url).hostname)
    } catch {
      return null
    }
  } catch {
    return null
  }
}

// ─── Step 2: metadata (chrome.storage via background) ─────────────────────────

/** Slim `StoreInfo` from `storeCacheByDomain` (no product arrays). */
export async function loadStoreMetadataFromExtension(hostHint: string): Promise<StoreInfo | null> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        {
          type: 'GET_STORE_INFO',
          from: 'popup',
          payload: { host: hostHint },
        } satisfies ExtMessage,
        (res: ExtMessage | undefined) => {
          if (chrome.runtime.lastError) {
            resolve(null)
            return
          }
          if (res?.type === 'STORE_INFO_RESPONSE') resolve(res.payload)
          else resolve(null)
        },
      )
    } catch {
      resolve(null)
    }
  })
}

// ─── Step 3: catalog (IndexedDB) ──────────────────────────────────────────────

export async function loadProductsFromIndexedDb(domain: string): Promise<CatalogProductRow[]> {
  try {
    return await dbGetByDomain<CatalogProductRow>(STORE_PRODUCTS, normalizeStoreDomainKey(domain))
  } catch {
    return []
  }
}

export async function loadCollectionsFromIndexedDb(domain: string): Promise<CatalogCollectionRow[]> {
  try {
    return await dbGetByDomain<CatalogCollectionRow>(
      STORE_COLLECTIONS,
      normalizeStoreDomainKey(domain),
    )
  } catch {
    return []
  }
}

export async function loadCatalogFromIndexedDb(domain: string): Promise<{
  products: CatalogProductRow[]
  collections: CatalogCollectionRow[]
}> {
  const key = normalizeStoreDomainKey(domain)
  const [products, collections] = await Promise.all([
    loadProductsFromIndexedDb(key),
    loadCollectionsFromIndexedDb(key),
  ])
  return { products, collections }
}

// ─── HTML-based theme + apps detection (official pipeline) ────────────────────

/**
 * Parse `Shopify.theme` out of an HTML string using DOMParser.
 * Looks for an inline `<script>` in `<head>` that assigns `Shopify.theme = {...}`.
 */
export function getShopifyThemeFromHtml(htmlString: string): Record<string, unknown> | null {
  try {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html')
    const script = Array.from(doc.querySelectorAll('head script:not([src]):not([class])')).find(
      (s) => (s.textContent ?? '').includes('Shopify.theme'),
    )
    if (!script) return null
    const match = (script.textContent ?? '').match(/Shopify\.theme\s*=\s*(\{[^;]+\})/)
    if (!match?.[1]) return null
    return JSON.parse(match[1]) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Detects Shopify apps from a parsed HTML string.
 * Fetches the app catalog, matches patterns against script/link tags and DOM selectors,
 * then returns a detailed result object (compatible with `samples/app-domparser.js`).
 */
export async function detectAppsFromHtmlString(
  htmlString: string,
): Promise<Record<string, unknown>> {
  const APPS_JSON_URL =
    'https://pandatests.myshopify.com/cdn/shop/t/70/assets/apps.json?v=126819430410946608741777188403'

  const doc = new DOMParser().parseFromString(htmlString, 'text/html')
  if (doc.querySelector('parsererror')) throw new Error('Invalid HTML string provided.')

  const fetchJSON = async (url: string): Promise<Array<Record<string, unknown>>> => {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Failed to fetch catalog: ${res.status} ${res.statusText}`)
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error('Invalid catalog format')
    return data as Array<Record<string, unknown>>
  }

  const getAppName = (app: Record<string, unknown>) =>
    app['appTitle'] || app['name'] || (app['id'] != null ? `App #${app['id']}` : 'Unknown App')

  const getAppCategory = (app: Record<string, unknown>) => {
    const cat = app['category']
    if (typeof cat === 'string' && cat.trim()) return cat
    try {
      const cats = JSON.parse(String(app['categoriesJson'] ?? '[]')) as unknown
      if (Array.isArray(cats) && typeof cats[0] === 'string' && (cats[0] as string).trim())
        return cats[0] as string
    } catch { /* ignore */ }
    return 'Uncategorized'
  }

  const getAppKey = (app: Record<string, unknown>) =>
    app['id']?.toString() || String(getAppName(app))

  const matchesPattern = (text: unknown, patterns: unknown): boolean =>
    Array.isArray(patterns) &&
    patterns.some((p) => String(text ?? '').toLowerCase().includes(String(p).toLowerCase()))

  const scripts = [...doc.querySelectorAll('script')]
  const links = [...doc.querySelectorAll('link[href]')]

  const detectByDOM = (app: Record<string, unknown>) =>
    ((app['domSelectors'] as string[]) || [])
      .map((sel: string) => {
        try { return doc.querySelectorAll(sel).length } catch { return 0 }
      })
      .filter((count: number) => count > 0)
      .map((count: number, i: number) =>
        `(DOM: ${count} x ${(app['domSelectors'] as string[])[i]})`,
      )

  const detected = new Map<string, Record<string, unknown>>()
  const addDetection = (app: Record<string, unknown>, sources: string[]) => {
    const key = getAppKey(app)
    if (!detected.has(key)) {
      detected.set(key, {
        ...app,
        name: getAppName(app),
        category: getAppCategory(app),
        sourceAppUrl: app['sourceAppUrl'] || null,
        appIconUrl: app['appIconUrl'] || null,
        scripts: [],
      })
    }
    const entry = detected.get(key)!
    ;(sources as string[]).forEach((src) => {
      const s = entry['scripts'] as string[]
      if (src && !s.includes(src)) s.push(src)
    })
  }

  const catalog = await fetchJSON(APPS_JSON_URL)

  for (const app of catalog) {
    const srcs = [
      ...new Set([
        ...scripts
          .map((s) => s.src || s.getAttribute('src') || '')
          .filter((src) => matchesPattern(src, app['patterns'])),
        ...links
          .map((l) => (l as HTMLLinkElement).href || l.getAttribute('href') || '')
          .filter((href) => matchesPattern(href, app['patterns'])),
      ]),
    ]
    const domHits = detectByDOM(app)
    if (srcs.length || domHits.length) addDetection(app, [...srcs, ...domHits])
  }

  scripts.forEach((script) => {
    const src = script.src || script.getAttribute('src') || ''
    if (!src) return
    const isShopify =
      src.includes('shopify.com') &&
      (src.includes('extensions') || src.includes('proxy') || src.includes('apps'))
    const hasShop = src.includes('.js') && src.includes('?shop=')
    if (isShopify || hasShop) {
      const match = catalog.find((app) => matchesPattern(src, app['patterns']))
      if (match) addDetection(match, [src])
    }
  })

  const sectionCount = doc.querySelectorAll(
    "[id*='shopify-section'] > [class*='_ss_'][class*='section-template']",
  ).length
  if (sectionCount) {
    addDetection(
      { id: 'sections-store-dom', appTitle: 'Sections Store', category: 'Page Builders' },
      [`(DOM: ${sectionCount} section-template elements)`],
    )
  }

  const allScriptSrcs = new Set(
    [...detected.values()].flatMap((app) =>
      (app['scripts'] as string[]).filter((s) => s?.startsWith('http')),
    ),
  )
  const headScripts = doc.head?.querySelectorAll('script') || []
  const bodyScripts = doc.body?.querySelectorAll('script') || []

  const result = {
    url: null,
    source_apps_url: APPS_JSON_URL,
    catalog_total: catalog.length,
    detected_apps: [...detected.values()],
    apps: Object.fromEntries([...detected.entries()].map(([_, v]) => [v['name'], v])),
    total_detected: detected.size,
    total_head_scripts: headScripts.length,
    total_body_scripts: bodyScripts.length,
    total_scripts: headScripts.length + bodyScripts.length,
    total_stylesheets: doc.querySelectorAll("link[rel='stylesheet']").length,
    section_store_count: sectionCount,
    detected_script_srcs: [...allScriptSrcs],
  }

  console.log('%c Shopify App Detector — Results', 'font-size:16px;font-weight:bold;color:#96bf48')
  console.log('────────────────────────────────────────')
  console.log(`Apps detected: ${result.total_detected}`)
  console.log(`Scripts: head=${result.total_head_scripts}, body=${result.total_body_scripts}`)
  if (sectionCount) console.log(`Section Store sections: ${sectionCount}`)
  console.log('────────────────────────────────────────')
  if (result.detected_script_srcs.length) console.log('Detected script URLs:', result.detected_script_srcs)
  if (Object.keys(result.apps).length) console.log('Apps:', result.apps)
  else console.log('No apps detected.')

  ;(window as Window & { __shopifyApps?: unknown }).__shopifyApps = result
  return result
}

/**
 * Extract contact emails from full storefront HTML.
 * Mirrors the content-script regex + blacklist behavior.
 */
export function extractEmailsFromHtmlString(htmlString: string): string[] {
  const emailBlacklist = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico', 'sentry.io']
  const emailPattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
  const emailsFound = new Set<string>()

  for (const e of htmlString.match(emailPattern) || []) {
    const normalized = e.trim().toLowerCase()
    if (!normalized) continue
    if (normalized.includes('@js.')) continue
    if (!emailBlacklist.some((ex) => normalized.includes(ex))) emailsFound.add(normalized)
  }

  try {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html')
    doc.querySelectorAll('a[href^="mailto:"]').forEach((el) => {
      const raw = (el as HTMLAnchorElement).getAttribute('href') ?? ''
      const email = raw.replace('mailto:', '').split('?')[0].trim().toLowerCase()
      if (email && !email.includes('@js.') && !emailBlacklist.some((ex) => email.includes(ex))) {
        emailsFound.add(email)
      }
    })
  } catch {
    // no-op
  }

  return [...emailsFound]
}

function extractEmailsFromDocument(doc: Document): string[] {
  const emailBlacklist = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico', 'sentry.io']
  const emailsFound = new Set<string>()
  doc.querySelectorAll('a[href^="mailto:"]').forEach((el) => {
    const raw = (el as HTMLAnchorElement).getAttribute('href') ?? ''
    const email = raw.replace('mailto:', '').split('?')[0].trim().toLowerCase()
    if (email && !email.includes('@js.') && !emailBlacklist.some((ex) => email.includes(ex))) {
      emailsFound.add(email)
    }
  })
  return [...emailsFound]
}

// Social platform rules — kept in sync with content/index.ts collectStoreContacts().
const SOCIAL_RULES: Array<{
  platform: string
  pattern: RegExp
  blacklist: string[]
}> = [
  { platform: 'instagram', pattern: /instagram\.com\//, blacklist: ['/p/', '/reel/', '/explore/', '/stories/'] },
  { platform: 'facebook',  pattern: /facebook\.com\//,  blacklist: ['/sharer', '/share', '/dialog/', '/watch/', '/groups/'] },
  { platform: 'twitter',   pattern: /twitter\.com\//,   blacklist: ['/share', '/intent/', '/hashtag/'] },
  { platform: 'x',         pattern: /x\.com\//,         blacklist: ['/share', '/intent/', '/i/'] },
  { platform: 'tiktok',    pattern: /tiktok\.com\/@/,   blacklist: [] },
  { platform: 'youtube',   pattern: /youtube\.com\/(channel\/|c\/|@|user\/)/, blacklist: ['/watch', '/shorts/', '/playlist', '/embed/'] },
  { platform: 'pinterest', pattern: /pinterest\.com\//,  blacklist: ['/pin/', '/search/', '/explore/'] },
  { platform: 'linkedin',  pattern: /linkedin\.com\/(company|in)\//, blacklist: ['/sharing/', '/share'] },
  { platform: 'snapchat',  pattern: /snapchat\.com\/add\//, blacklist: [] },
  { platform: 'vimeo',     pattern: /vimeo\.com\/(channels\/|groups\/|[a-zA-Z][a-zA-Z0-9]+)/, blacklist: ['/video/', '/ondemand/', '/showcase/'] },
  { platform: 'discord',   pattern: /discord\.(gg|com\/invite)\//, blacklist: [] },
]

/**
 * Extract social profile links from full storefront HTML.
 * Mirrors content-script social rules + adds Discord.
 */
export function parseSocialFromHtmlString(htmlString: string): Record<string, string> {
  const social: Record<string, string> = {}
  try {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html')
    doc.querySelectorAll('a[href]').forEach((el) => {
      const href = (el as HTMLAnchorElement).getAttribute('href') ?? ''
      if (!href) return
      for (const { platform, pattern, blacklist } of SOCIAL_RULES) {
        if (social[platform]) continue
        if (!pattern.test(href)) continue
        if (blacklist.some((b) => href.includes(b))) continue
        social[platform] = href
      }
    })
  } catch {
    // no-op
  }
  return social
}

function parseSocialFromDocument(doc: Document): Record<string, string> {
  const social: Record<string, string> = {}
  doc.querySelectorAll('a[href]').forEach((el) => {
    const href = (el as HTMLAnchorElement).getAttribute('href') ?? ''
    if (!href) return
    for (const { platform, pattern, blacklist } of SOCIAL_RULES) {
      if (social[platform]) continue
      if (!pattern.test(href)) continue
      if (blacklist.some((b) => href.includes(b))) continue
      social[platform] = href
    }
  })
  return social
}

/**
 * Parse both emails and social links from full storefront HTML,
 * returning a StoreContacts object ready to persist.
 */
export function parseContactsFromHtmlString(htmlString: string): StoreContacts {
  // Parse HTML once to avoid extra synchronous work during popup boot.
  const doc = new DOMParser().parseFromString(htmlString, 'text/html')
  const regexEmails = new Set(extractEmailsFromHtmlString(htmlString))
  for (const email of extractEmailsFromDocument(doc)) regexEmails.add(email)
  return {
    emails: [...regexEmails],
    social: parseSocialFromDocument(doc),
  }
}

export function parseThemeFromHtmlString(htmlString: string): {
  rawTheme: Record<string, unknown> | null
  theme: Partial<ShopifyTheme>
} {
  const rawTheme = getShopifyThemeFromHtml(htmlString)
  const theme: Partial<ShopifyTheme> =
    rawTheme == null
      ? {}
      : {
          name:
            rawTheme['schema_name'] != null && String(rawTheme['schema_name']).trim()
              ? String(rawTheme['schema_name']).trim()
              : 'Unknown',
          version:
            rawTheme['schema_version'] != null && String(rawTheme['schema_version']).trim()
              ? String(rawTheme['schema_version']).trim()
              : '',
          themeRenamed: rawTheme['name'] != null ? String(rawTheme['name']) : undefined,
          themeId: typeof rawTheme['id'] === 'number' ? rawTheme['id'] : undefined,
          schemaName: rawTheme['schema_name'] != null ? String(rawTheme['schema_name']) : null,
          schemaVersion: rawTheme['schema_version'] != null ? String(rawTheme['schema_version']) : null,
          themeStoreId: rawTheme['theme_store_id'] != null ? Number(rawTheme['theme_store_id']) : null,
          role: rawTheme['role'] != null ? String(rawTheme['role']) : null,
          themeHandle:
            rawTheme['handle'] == null || rawTheme['handle'] === 'null'
              ? null
              : String(rawTheme['handle']),
          author: 'Shopify',
          isOS2: Boolean(rawTheme['schema_name']),
        }
  return { rawTheme, theme }
}

export async function parseAppsFromHtmlString(htmlString: string): Promise<{
  appDetectionResult: Record<string, unknown>
  apps: ShopifyApp[]
}> {
  const appDetectionResult = await detectAppsFromHtmlString(htmlString)
  const rawDetectedApps = Array.isArray((appDetectionResult as { detected_apps?: unknown }).detected_apps)
    ? ((appDetectionResult as { detected_apps: Array<Record<string, unknown>> }).detected_apps)
    : []
  const apps: ShopifyApp[] = rawDetectedApps.map((a) => {
    const catRaw = String(a['category'] ?? '').toLowerCase()
    const category: ShopifyApp['category'] =
      catRaw.includes('marketing')
        ? 'marketing'
        : catRaw.includes('sales')
          ? 'sales'
          : catRaw.includes('review')
            ? 'reviews'
            : catRaw.includes('analytic')
              ? 'analytics'
              : 'other'
    return {
      id: String(a['id'] ?? a['name'] ?? 'unknown'),
      name: String(a['name'] ?? 'Unknown App'),
      category,
      appTitle: a['appTitle'] != null ? String(a['appTitle']) : undefined,
      appIconUrl: a['appIconUrl'] != null ? String(a['appIconUrl']) : null,
      sourceAppUrl: a['sourceAppUrl'] != null ? String(a['sourceAppUrl']) : undefined,
      matchScripts: Array.isArray(a['scripts'])
        ? (a['scripts'] as unknown[]).filter((s): s is string => typeof s === 'string')
        : [],
    }
  })
  return { appDetectionResult, apps }
}

/**
 * Official entry point for theme + apps detection.
 * Fetches the active tab's full HTML, then runs DOMParser-based extraction
 * for both `Shopify.theme` and the app catalog — all in the popup process.
 * Persists the result to the background cache so it is visible on all tabs.
 */
export async function spykitFetchThemeAndAppsFromHtml(): Promise<SpykitDebugAllResponse> {
  emitSpykitToast('Fetching theme & apps...')
  const htmlRes = await spykitDebugFetchHtmlFromActiveTab()
  if (!htmlRes.ok) return { ok: false, error: htmlRes.error }
  console.log('[SpyKit Popup] theme+apps: html fetched', {
    url: htmlRes.url,
    htmlLength: htmlRes.html.length,
  })

  let domain: string
  try {
    domain = normalizeStoreDomainKey(new URL(htmlRes.url).hostname)
  } catch {
    domain = normalizeStoreDomainKey(htmlRes.url)
  }

  // Same as debug path: one HTML fetch, then dedicated parsers.
  const { rawTheme, theme } = parseThemeFromHtmlString(htmlRes.html)
  console.log('[SpyKit Popup] theme+apps: parsed theme', {
    rawTheme,
    normalizedTheme: theme,
  })

  const { appDetectionResult, apps } = await parseAppsFromHtmlString(htmlRes.html)
  console.log('[SpyKit Popup] theme+apps: parsed apps', {
    sourceAppsUrl: (appDetectionResult as { source_apps_url?: unknown }).source_apps_url ?? null,
    totalDetected: apps.length,
    apps,
    fullResult: appDetectionResult,
  })

  const contacts = parseContactsFromHtmlString(htmlRes.html)
  console.log('[SpyKit Popup] theme+apps: parsed contacts', {
    emails: contacts.emails,
    social: contacts.social,
  })

  try {
    await persistSnapshotToBackground(domain, theme, rawTheme, apps, appDetectionResult)
  } catch (e) {
    console.warn('[SpyKit Popup] spykitFetchThemeAndAppsFromHtml: snapshot persist failed', e)
  }

  // Persist contacts in background without blocking popup initial render.
  chrome.runtime.sendMessage(
    {
      type: 'STORE_CONTACTS',
      from: 'content',
      payload: { domain, contacts },
    } satisfies ExtMessage,
    () => {
      if (chrome.runtime.lastError) {
        console.warn(
          '[SpyKit Popup] spykitFetchThemeAndAppsFromHtml: contacts persist failed',
          chrome.runtime.lastError.message,
        )
      }
    },
  )

  return {
    ok: true,
    domain,
    theme,
    shopifyThemeRaw: rawTheme,
    apps,
    appDetectionResult,
    emails: contacts.emails,
    contacts,
    source: 'page_context',
  }
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export type PopupStoreBundle = {
  storeInfo: StoreInfo
  /** Canonical domain used for IDB + cache (matches `storeInfo.domain`). */
  domain: string
  products: CatalogProductRow[]
  collections: CatalogCollectionRow[]
}

export type FetchAllDataStep =
  | 'fetching-theme'
  | 'fetching-store'
  | 'fetching-collections'
  | 'fetching-products'
  | 'fetching-apps'
  | 'done'

export type FetchAllDataOptions = {
  /** When true, skip per-step toasts (used after theme/apps/meta are already shown). */
  quiet?: boolean
}

/**
 * Step-by-step popup data load with optional per-step toast notifications:
 *  1. Resolve domain + read store metadata   → "Fetching store data"
 *  2. Read collections from IndexedDB        → "Fetching collections"
 *  3. Read products from IndexedDB           → "Fetching products"
 *
 * Theme + apps are fetched separately before this via `spykitFetchThemeAndAppsFromHtml`.
 */
export async function fetchAllData(
  onStep?: (step: FetchAllDataStep) => void,
  options?: FetchAllDataOptions,
): Promise<PopupStoreBundle | null> {
  const quiet = options?.quiet === true
  const toast = (msg: string) => {
    if (!quiet) emitSpykitToast(msg)
  }

  // ── Step 1: store metadata ────────────────────────────────────────────────
  onStep?.('fetching-store')
  toast('Fetching store data')

  const hint = await resolveActiveTabShopDomain()
  if (!hint) return null

  const slim = await loadStoreMetadataFromExtension(hint)
  const idbDomain = normalizeStoreDomainKey(slim?.domain ?? hint)

  // ── Step 2: collections ───────────────────────────────────────────────────
  onStep?.('fetching-collections')
  const expectedCollections = slim?.shopMeta?.published_collections_count
  toast(
    typeof expectedCollections === 'number'
      ? `Fetching ${expectedCollections.toLocaleString()} collections`
      : 'Fetching collections',
  )

  const collections = await loadCollectionsFromIndexedDb(idbDomain)

  // ── Step 3: products ──────────────────────────────────────────────────────
  onStep?.('fetching-products')
  const expectedProducts = slim?.shopMeta?.published_products_count
  toast(
    typeof expectedProducts === 'number'
      ? `Fetching ${expectedProducts.toLocaleString()} products`
      : 'Fetching products',
  )

  const products = await loadProductsFromIndexedDb(idbDomain)

  const storeInfo: StoreInfo = {
    ...(slim ?? {
      domain: idbDomain,
      theme: null,
      apps: [],
      productCount: 0,
      collectionCount: 0,
      detectedAt: Date.now(),
      catalogFullDataInIndexedDb: false,
    }),
    domain: idbDomain,
    productsSample: products,
    collectionsSample: collections,
  }

  const needsCatalogSync =
    !storeInfo.catalogFullDataInIndexedDb &&
    storeInfo.catalogLoading !== true &&
    products.length === 0

  if (needsCatalogSync) {
    try {
      if (!quiet) {
        emitSpykitToast('Syncing product and collection catalog…')
      }
      chrome.runtime.sendMessage({ type: 'SYNC_CATALOG_ON_POPUP', from: 'popup' } satisfies ExtMessage)
    } catch {
      /* ignore */
    }
  }

  onStep?.('done')

  return { storeInfo, domain: idbDomain, products, collections }
}

/**
 * Lightweight re-read of store metadata + IDB catalog without toast steps.
 * Used for storage-change refreshes.
 */
export async function loadPopupStoreBundle(): Promise<PopupStoreBundle | null> {
  const hint = await resolveActiveTabShopDomain()
  if (!hint) return null

  const slim = await loadStoreMetadataFromExtension(hint)
  const idbDomain = normalizeStoreDomainKey(slim?.domain ?? hint)

  const { products, collections } = await loadCatalogFromIndexedDb(idbDomain)

  const storeInfo: StoreInfo = {
    ...(slim ?? {
      domain: idbDomain,
      theme: null,
      apps: [],
      productCount: 0,
      collectionCount: 0,
      detectedAt: Date.now(),
      catalogFullDataInIndexedDb: false,
    }),
    domain: idbDomain,
    productsSample: products,
    collectionsSample: collections,
  }

  return { storeInfo, domain: idbDomain, products, collections }
}

async function pingSpykitContentOnce(tabId: number): Promise<boolean> {
  try {
    const r: unknown = await chrome.tabs.sendMessage(tabId, {
      type: 'SPYKIT_CS_PING',
      from: 'popup',
    } satisfies ExtMessage)
    return Boolean(r && typeof r === 'object' && 'ok' in r && (r as { ok?: boolean }).ok === true)
  } catch {
    return false
  }
}

/**
 * Poll until the manifest content script responds to `SPYKIT_CS_PING`, or `maxMs` elapses.
 * Prevents `chrome.tabs.sendMessage` → "Receiving end does not exist" on cold tabs.
 */
async function waitForSpykitContentScript(tabId: number, maxMs = 20_000): Promise<boolean> {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    if (await pingSpykitContentOnce(tabId)) return true
    await new Promise((r) => setTimeout(r, 150))
  }
  return false
}

/**
 * The "active" tab in the last-focused *browser* window is not always the storefront
 * (pinned admin tab, split focus, etc.). Find any normal-window http(s) tab where our
 * manifest content script is alive by probing `SPYKIT_CS_PING`.
 */
async function findTabIdWithSpykitContentScript(maxTotalMs = 28_000): Promise<number | null> {
  const started = Date.now()
  const timeLeft = () => Math.max(0, maxTotalMs - (Date.now() - started))

  const tryTab = async (tabId: number, budgetMs: number) => {
    if (budgetMs < 400) return false
    return waitForSpykitContentScript(tabId, budgetMs)
  }

  const primary = await getLastFocusedHttpTab()
  if (primary?.id) {
    const ok = await tryTab(primary.id, Math.min(16_000, timeLeft() || 16_000))
    if (ok) return primary.id
  }

  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] })
  const candidates: chrome.tabs.Tab[] = []
  for (const win of windows) {
    for (const t of win.tabs ?? []) {
      if (!t.id || !t.url) continue
      try {
        const u = new URL(t.url)
        if (u.protocol !== 'http:' && u.protocol !== 'https:') continue
      } catch {
        continue
      }
      candidates.push(t)
    }
  }

  candidates.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))

  for (const t of candidates) {
    if (!t.id || t.id === primary?.id) continue
    const budget = Math.min(6000, Math.max(800, timeLeft()))
    if (budget < 800) break
    if (await tryTab(t.id, budget)) return t.id
  }

  return null
}

async function spykitDebugFetchThemeViaMainWorldInject(tabId: number): Promise<SpykitDebugThemeResponse> {
  let results: chrome.scripting.InjectionResult<unknown>[]
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: extractShopifyThemeMainWorld,
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  const first = results[0]?.result
  if (!first || typeof first !== 'object' || !('ok' in first)) {
    return { ok: false, error: 'no_inject_result' }
  }

  const payload = first as {
    ok: boolean
    error?: string
    domain?: string
    theme?: unknown
    shopifyThemeRaw?: unknown
  }

  if (!payload.ok) {
    return { ok: false, error: String(payload.error ?? 'inject_failed') }
  }

  const domain = String(payload.domain ?? '')
  const themeObj = (payload.theme ?? {}) as Partial<ShopifyTheme>
  const raw =
    payload.shopifyThemeRaw != null &&
    typeof payload.shopifyThemeRaw === 'object' &&
    !Array.isArray(payload.shopifyThemeRaw)
      ? (payload.shopifyThemeRaw as Record<string, unknown>)
      : null

  try {
    await new Promise<void>((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'SPYKIT_THEME_FROM_MAIN_WORLD',
          from: 'popup',
          payload: { domain, theme: themeObj, shopifyThemeRaw: raw },
        } satisfies ExtMessage,
        () => {
          const le = chrome.runtime.lastError
          if (le) reject(new Error(le.message))
          else resolve()
        },
      )
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  return { ok: true, theme: themeObj, shopifyThemeRaw: raw, domain }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page context: single-round-trip DOM snapshot + MAIN-world Shopify globals
// ─────────────────────────────────────────────────────────────────────────────

export type SpykitPageContextResponse =
  | {
      ok: true
      domain: string
      theme: Partial<ShopifyTheme>
      shopifyThemeRaw: Record<string, unknown> | null
      /** Resolved `src` of every `<script src>` on the page. */
      scriptSrcs: string[]
      /** Resolved / attribute `href` of every `<link href>` on the page. */
      linkHrefs: string[]
      /** First 3000 chars of each inline `<script>` (pattern matching only). */
      inlineScripts: string[]
      /** `document.head.innerHTML` snapshot. */
      headHtml: string
      url: string
    }
  | { ok: false; error: string }

/** Ask the content script on `tabId` for a page context snapshot. */
async function spykitFetchPageContext(tabId: number): Promise<SpykitPageContextResponse> {
  try {
    const r: unknown = await chrome.tabs.sendMessage(tabId, {
      type: 'SPYKIT_FETCH_PAGE_CONTEXT',
      from: 'popup',
    } satisfies ExtMessage)
    if (r && typeof r === 'object' && 'ok' in r && (r as { ok?: boolean }).ok === true) {
      return r as SpykitPageContextResponse
    }
    const err =
      r && typeof r === 'object' && 'error' in r ? String((r as { error?: unknown }).error) : 'unknown'
    return { ok: false, error: err }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Find the `apps.json` URL embedded in the store CDN script paths — same logic as content script. */
function resolveAppsJsonUrlFromSrcs(scriptSrcs: string[], fallback: string): string {
  for (const src of scriptSrcs) {
    try {
      const m = src.match(/\/cdn\/shop\/t\/(\d+)\//)
      if (m?.[1]) {
        const origin = new URL(src).origin
        return `${origin}/cdn/shop/t/${m[1]}/assets/apps.json`
      }
    } catch {
      /* bad URL */
    }
  }
  return fallback
}

/**
 * Runs entirely in the popup JS (no message port involved):
 *  1. Fetches the store's apps catalog
 *  2. Matches script srcs, link hrefs, and inline script snippets against catalog patterns
 *
 * This avoids any risk of "message port closed" because all the slow work
 * (network fetch + pattern matching) runs in the popup process.
 */
async function detectAppsFromPageContext(
  ctx: Extract<SpykitPageContextResponse, { ok: true }>,
): Promise<ShopifyApp[]> {
  const catalogUrl = resolveAppsJsonUrlFromSrcs(ctx.scriptSrcs, APPS_CATALOG_JSON_URL)

  let catalog: unknown[]
  try {
    let res = await fetch(catalogUrl, { cache: 'no-store' })
    if (!res.ok && catalogUrl !== APPS_CATALOG_JSON_URL) {
      res = await fetch(APPS_CATALOG_JSON_URL, { cache: 'no-store' })
    }
    const data: unknown = await res.json()
    catalog = Array.isArray(data) ? data : []
  } catch {
    return []
  }
  if (catalog.length === 0) return []

  // ── Helpers (mirror of content/index.ts) ──────────────────────────────────
  const getPatterns = (app: Record<string, unknown>): string[] =>
    Array.isArray(app['patterns']) ? (app['patterns'] as unknown[]).map(String) : []

  const getKey = (app: Record<string, unknown>): string =>
    app['id'] != null
      ? String(app['id'])
      : String(app['appTitle'] ?? app['name'] ?? 'unknown')

  const getName = (app: Record<string, unknown>): string =>
    String(app['appTitle'] ?? app['name'] ?? (app['id'] != null ? `App #${app['id']}` : 'Unknown App'))

  const getCategory = (app: Record<string, unknown>): string => {
    if (typeof app['category'] === 'string' && app['category'].trim()) return app['category']
    if (typeof app['categoriesJson'] === 'string') {
      try {
        const p = JSON.parse(app['categoriesJson']) as unknown
        if (Array.isArray(p) && typeof p[0] === 'string') return p[0] as string
      } catch {
        /* ignore */
      }
    }
    return 'Uncategorized'
  }

  // ── Match: script srcs + link hrefs + inline script snippets ──────────────
  const allSrcs = [...ctx.scriptSrcs, ...ctx.linkHrefs]
  const detectedApps: ShopifyApp[] = []
  const detectedByKey = new Map<string, ShopifyApp & { matchScripts: string[] }>()

  const merge = (app: Record<string, unknown>, matched: string[]) => {
    const key = getKey(app)
    if (!detectedByKey.has(key)) {
      const entry = {
        ...(app as Partial<ShopifyApp>),
        id: app['id'] != null ? String(app['id']) : key,
        name: getName(app),
        category: getCategory(app) as ShopifyApp['category'],
        matchScripts: [] as string[],
      } as ShopifyApp & { matchScripts: string[] }
      detectedApps.push(entry)
      detectedByKey.set(key, entry)
    }
    const entry = detectedByKey.get(key)!
    const existing = new Set(entry.matchScripts)
    for (const s of matched) {
      if (!existing.has(s)) {
        entry.matchScripts.push(s)
        existing.add(s)
      }
    }
  }

  for (const rawApp of catalog) {
    const app = rawApp as Record<string, unknown>
    const patterns = getPatterns(app)
    if (patterns.length === 0) continue

    const matched: string[] = []
    for (const pattern of patterns) {
      const lp = pattern.toLowerCase()
      for (const src of allSrcs) {
        if (src.toLowerCase().includes(lp)) matched.push(src)
      }
      for (const inline of ctx.inlineScripts) {
        if (inline.toLowerCase().includes(lp)) {
          matched.push(`(inline: ${pattern})`)
          break
        }
      }
    }
    if (matched.length > 0) merge(app, [...new Set(matched)])
  }

  // ── Shopify extension CDN scripts (unknown apps) ──────────────────────────
  for (const src of ctx.scriptSrcs) {
    const isShopifyExt =
      (src.includes('shopify.com') &&
        (src.includes('extensions') || src.includes('proxy') || src.includes('apps'))) ||
      (src.includes('.js') && src.includes('?shop='))
    if (!isShopifyExt) continue
    const alreadyMatched = [...detectedByKey.values()].some((a) =>
      a.matchScripts.includes(src),
    )
    if (!alreadyMatched) {
      const lsrc = src.toLowerCase()
      const match = (catalog as Record<string, unknown>[]).find((a) =>
        getPatterns(a).some((p) => lsrc.includes(p.toLowerCase())),
      )
      if (match) merge(match, [src])
    }
  }

  console.log('[SpyKit Popup] detectAppsFromPageContext done', {
    catalogUrl,
    catalogTotal: catalog.length,
    detected: detectedApps.length,
    pageUrl: ctx.url,
  })
  return detectedApps
}

async function persistSnapshotToBackground(
  domain: string,
  theme: Partial<ShopifyTheme>,
  shopifyThemeRaw: Record<string, unknown> | null,
  apps: ShopifyApp[],
  appDetectionResult?: Record<string, unknown> | null,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'SPYKIT_STORE_SNAPSHOT_FROM_POPUP',
        from: 'popup',
        payload: { domain, theme, shopifyThemeRaw, apps, appDetectionResult },
      } satisfies ExtMessage,
      () => {
        const le = chrome.runtime.lastError
        if (le) reject(new Error(le.message))
        else resolve()
      },
    )
  })
}

export type SpykitDebugAllResponse =
  | {
      ok: true
      domain: string
      theme: Partial<ShopifyTheme>
      shopifyThemeRaw: Record<string, unknown> | null | undefined
      apps: ShopifyApp[]
      appDetectionResult?: Record<string, unknown> | null
      emails?: string[]
      contacts?: StoreContacts
      source: 'page_context' | 'main_world_fallback'
    }
  | { ok: false; error: string }

/**
 * Single entry point for both the **Theme** and **Apps** debug buttons:
 *  1. Finds a storefront tab where our content script is alive (`SPYKIT_CS_PING`).
 *  2. Sends `SPYKIT_FETCH_PAGE_CONTEXT` — content script returns a DOM snapshot +
 *     MAIN-world Shopify data in one round-trip, with no long-running work.
 *  3. Runs app catalog fetch + pattern matching **entirely in the popup JS**
 *     (no message port involvement for the slow work → no "port closed" error).
 *  4. Persists theme + apps to the background cache via `SPYKIT_STORE_SNAPSHOT_FROM_POPUP`.
 *  5. Falls back to MAIN-world `executeScript` for theme when no content script is found.
 */
export async function spykitDebugFetchAllFromActiveTab(): Promise<SpykitDebugAllResponse> {
  const primary = await getLastFocusedHttpTab()
  if (!primary?.id || !primary.url) return { ok: false, error: 'no_active_tab' }
  try {
    const u = new URL(primary.url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, error: 'unsupported_tab_url' }
    }
  } catch {
    return { ok: false, error: 'bad_tab_url' }
  }

  const tabId = await findTabIdWithSpykitContentScript()

  // ── No content script found → MAIN world executeScript for theme only ─────
  if (tabId == null) {
    console.warn('[SpyKit Popup] spykitDebugFetchAll: no content script tab found; MAIN-world theme fallback')
    const r = await spykitDebugFetchThemeViaMainWorldInject(primary.id)
    if (!r.ok) return r
    try {
      await persistSnapshotToBackground(r.domain, r.theme, r.shopifyThemeRaw ?? null, [])
    } catch (e) {
      console.warn('[SpyKit Popup] persistSnapshotToBackground failed', e)
    }
    return { ok: true, domain: r.domain, theme: r.theme, shopifyThemeRaw: r.shopifyThemeRaw, apps: [], source: 'main_world_fallback' }
  }

  // ── Content script is alive → one-shot page context ───────────────────────
  const ctx = await spykitFetchPageContext(tabId)

  if (!ctx.ok) {
    console.warn('[SpyKit Popup] spykitDebugFetchAll: page context failed, MAIN-world fallback', ctx.error)
    const r = await spykitDebugFetchThemeViaMainWorldInject(tabId)
    if (!r.ok) return r
    try {
      await persistSnapshotToBackground(r.domain, r.theme, r.shopifyThemeRaw ?? null, [])
    } catch (e) {
      console.warn('[SpyKit Popup] persistSnapshotToBackground failed', e)
    }
    return { ok: true, domain: r.domain, theme: r.theme, shopifyThemeRaw: r.shopifyThemeRaw, apps: [], source: 'main_world_fallback' }
  }

  // ── App detection runs in popup JS — no message port involved ─────────────
  const apps = await detectAppsFromPageContext(ctx)

  try {
    await persistSnapshotToBackground(ctx.domain, ctx.theme, ctx.shopifyThemeRaw, apps)
  } catch (e) {
    console.warn('[SpyKit Popup] persistSnapshotToBackground failed', e)
  }

  return {
    ok: true,
    domain: ctx.domain,
    theme: ctx.theme,
    shopifyThemeRaw: ctx.shopifyThemeRaw,
    apps,
    source: 'page_context',
  }
}

export type SpykitDebugThemeResponse =
  | {
      ok: true
      theme: Partial<ShopifyTheme>
      shopifyThemeRaw: Record<string, unknown> | null | undefined
      domain: string
    }
  | { ok: false; error: string }

export type SpykitDebugAppsResponse =
  | {
      ok: true
      apps: ShopifyApp[]
      domain: string
      standaloneResult: Record<string, unknown> | null
    }
  | { ok: false; error: string }

export async function spykitDebugFetchThemeFromActiveTab(): Promise<SpykitDebugThemeResponse> {
  const primary = await getLastFocusedHttpTab()
  if (!primary?.id || !primary.url) return { ok: false, error: 'no_active_tab' }
  try {
    const u = new URL(primary.url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, error: 'unsupported_tab_url' }
    }
  } catch {
    return { ok: false, error: 'bad_tab_url' }
  }

  const tabId = await findTabIdWithSpykitContentScript()
  if (tabId == null) {
    console.warn(
      '[SpyKit Popup] no tab answered SPYKIT_CS_PING — MAIN-world theme read on last-focused tab',
    )
    return await spykitDebugFetchThemeViaMainWorldInject(primary.id)
  }

  try {
    const r: unknown = await chrome.tabs.sendMessage(tabId, {
      type: 'SPYKIT_DEBUG_FETCH_THEME',
      from: 'popup',
    } satisfies ExtMessage)
    if (r && typeof r === 'object' && 'ok' in r) {
      const rr = r as { ok?: boolean; error?: unknown }
      if (rr.ok === true) return r as SpykitDebugThemeResponse
      if (String(rr.error ?? '') === 'not_shopify') {
        return { ok: false, error: 'not_shopify' }
      }
    }
  } catch (e) {
    console.warn('[SpyKit Popup] DEBUG_FETCH_THEME sendMessage failed — MAIN-world fallback', e)
  }

  return await spykitDebugFetchThemeViaMainWorldInject(tabId)
}

export async function spykitDebugFetchAppsFromActiveTab(): Promise<SpykitDebugAppsResponse> {
  const primary = await getLastFocusedHttpTab()
  if (!primary?.id || !primary.url) return { ok: false, error: 'no_active_tab' }
  try {
    const u = new URL(primary.url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, error: 'unsupported_tab_url' }
    }
  } catch {
    return { ok: false, error: 'bad_tab_url' }
  }

  const tabId = await findTabIdWithSpykitContentScript()
  if (tabId == null) {
    return {
      ok: false,
      error:
        'content_script_not_ready — leave a Shopify storefront tab open (https or http), reload it after installing/updating SpyKit, then try again',
    }
  }

  try {
    const r: unknown = await chrome.tabs.sendMessage(tabId, {
      type: 'SPYKIT_DEBUG_FETCH_APPS',
      from: 'popup',
    } satisfies ExtMessage)
    if (r && typeof r === 'object' && 'ok' in r && (r as { ok?: boolean }).ok === true) {
      return r as SpykitDebugAppsResponse
    }
    const err =
      r && typeof r === 'object' && 'error' in r ? String((r as { error?: unknown }).error) : 'unknown'
    return { ok: false, error: err }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export type SpykitDebugFetchHtmlResponse =
  | { ok: true; html: string; url: string }
  | { ok: false; error: string }

async function fetchHtmlViaExecuteScript(tabId: number, fallbackUrl: string): Promise<SpykitDebugFetchHtmlResponse> {
  console.log('[SpyKit Popup] debug-fetch-html: executeScript fallback start', { tabId })
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'ISOLATED',
      func: () => {
        const html = document.querySelector('html')?.innerHTML ?? ''
        return { html, url: location.href }
      },
    })
    const first = results[0]?.result as { html?: unknown; url?: unknown } | undefined
    console.log('[SpyKit Popup] debug-fetch-html: executeScript fallback success', {
      url: typeof first?.url === 'string' ? first.url : fallbackUrl,
      htmlLength: typeof first?.html === 'string' ? first.html.length : 0,
    })
    return {
      ok: true,
      html: typeof first?.html === 'string' ? first.html : '',
      url: typeof first?.url === 'string' ? first.url : fallbackUrl,
    }
  } catch (e) {
    console.warn('[SpyKit Popup] debug-fetch-html: executeScript fallback failed', e)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Debug-only helper: fetches full document HTML from the content script and
 * returns it so the popup can log it.
 */
export async function spykitDebugFetchHtmlFromActiveTab(): Promise<SpykitDebugFetchHtmlResponse> {
  console.log('[SpyKit Popup] debug-fetch-html: start')
  const primary = await getLastFocusedHttpTab()
  console.log('[SpyKit Popup] debug-fetch-html: primary tab', {
    id: primary?.id ?? null,
    url: primary?.url ?? null,
  })
  if (!primary?.id || !primary.url) return { ok: false, error: 'no_active_tab' }
  try {
    const u = new URL(primary.url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, error: 'unsupported_tab_url' }
    }
  } catch {
    return { ok: false, error: 'bad_tab_url' }
  }

  // For plain HTML capture, do not block on the long content-script ping sweep.
  // Use the resolved storefront tab directly; if message channel fails, fallback to executeScript.
  const tabId = primary.id
  console.log('[SpyKit Popup] debug-fetch-html: using tabId', tabId)
  try {
    console.log('[SpyKit Popup] debug-fetch-html: sending SPYKIT_DEBUG_FETCH_HTML')
    const r: unknown = await chrome.tabs.sendMessage(tabId, {
      type: 'SPYKIT_DEBUG_FETCH_HTML',
      from: 'popup',
    } satisfies ExtMessage)
    console.log('[SpyKit Popup] debug-fetch-html: raw response', r)
    if (r && typeof r === 'object' && 'ok' in r && (r as { ok?: boolean }).ok === true) {
      const out = r as { ok: true; html?: unknown; url?: unknown }
      return {
        ok: true,
        html: typeof out.html === 'string' ? out.html : '',
        url: typeof out.url === 'string' ? out.url : primary.url,
      }
    }
    const err =
      r && typeof r === 'object' && 'error' in r ? String((r as { error?: unknown }).error) : 'unknown'
    console.warn('[SpyKit Popup] debug-fetch-html: message returned error', err)
    if (err.toLowerCase().includes('node cannot be found in the current page')) {
      console.warn('[SpyKit Popup] debug-fetch-html: falling back to executeScript (node missing)')
      return await fetchHtmlViaExecuteScript(tabId, primary.url)
    }
    return { ok: false, error: err }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[SpyKit Popup] debug-fetch-html: sendMessage threw', msg)
    console.warn('[SpyKit Popup] debug-fetch-html: falling back to executeScript (throw path)')
    return await fetchHtmlViaExecuteScript(tabId, primary.url)
  }
}

export type SpykitDebugFetchMetaJsonResponse =
  | { ok: true; meta: ShopMetaJson | null; url: string }
  | { ok: false; error: string }

/**
 * Fetches `{origin}/meta.json` from the active storefront tab (via executeScript
 * so CORS is not an issue), persists to the background cache via `SHOP_META`,
 * and returns the parsed payload for immediate Zustand hydration.
 *
 * Called in `runLoad()` step 3 so store intelligence and stat boxes populate
 * before the slower IDB/catalog fetch begins.
 */
export async function spykitFetchAndPersistMetaJson(): Promise<SpykitDebugFetchMetaJsonResponse> {
  const result = await spykitDebugFetchMetaJsonFromActiveTab()
  if (!result.ok || !result.meta) return result

  // Derive domain from the meta.json URL.
  let domain: string
  try {
    domain = normalizeStoreDomainKey(new URL(result.url).hostname)
  } catch {
    domain = normalizeStoreDomainKey(result.url)
  }

  // Persist to background → chrome.storage so the rest of the pipeline sees it.
  try {
    await new Promise<void>((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'SHOP_META',
          from: 'content',
          payload: { domain, shopMeta: result.meta! },
        } satisfies ExtMessage,
        () => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
          else resolve()
        },
      )
    })
  } catch (e) {
    console.warn('[SpyKit Popup] spykitFetchAndPersistMetaJson: SHOP_META persist failed', e)
  }

  return result
}

/**
 * Debug-only helper: fetches `{origin}/meta.json` from the active storefront tab
 * by executing in-tab context, then returns parsed JSON to the popup for logging.
 */
export async function spykitDebugFetchMetaJsonFromActiveTab(): Promise<SpykitDebugFetchMetaJsonResponse> {
  const primary = await getLastFocusedHttpTab()
  if (!primary?.id || !primary.url) return { ok: false, error: 'no_active_tab' }
  try {
    const u = new URL(primary.url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, error: 'unsupported_tab_url' }
    }
  } catch {
    return { ok: false, error: 'bad_tab_url' }
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: primary.id },
      world: 'ISOLATED',
      func: async () => {
        const metaUrl = `${location.origin}/meta.json`
        try {
          const res = await fetch(metaUrl, { credentials: 'omit', cache: 'no-store' })
          if (!res.ok) {
            return { ok: false as const, error: `meta_http_${res.status}`, url: metaUrl }
          }
          const data = (await res.json()) as unknown
          return { ok: true as const, meta: data, url: metaUrl }
        } catch (e) {
          return {
            ok: false as const,
            error: e instanceof Error ? e.message : String(e),
            url: metaUrl,
          }
        }
      },
    })
    const out = results[0]?.result as
      | { ok?: boolean; meta?: unknown; error?: unknown; url?: unknown }
      | undefined
    if (!out || out.ok !== true) {
      const err = out?.error != null ? String(out.error) : 'unknown_error'
      return { ok: false, error: err }
    }
    return {
      ok: true,
      meta: (out.meta as ShopMetaJson | null | undefined) ?? null,
      url: typeof out.url === 'string' ? out.url : `${new URL(primary.url).origin}/meta.json`,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
