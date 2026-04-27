/**
 * Content script — runs in the isolated world on matching pages.
 *
 * Does **not** run theme/app/meta/contact collection on page load. The popup (or
 * a manual cache refresh) sends `SPYKIT_RUN_SHOP_SCAN` / `SPYKIT_FORCE_REFRESH`,
 * which injects `page-world.js` once, fetches `meta.json`, runs the app detector,
 * and scans contacts — same work as before, but only when the user opens SpyKit.
 *
 *  1. Bridge `postMessage` from the injected main-world script to the service worker.
 *  2. On demand: inject page-world, collect store data, relay `PAGE_DATA` / etc.
 */

import type { ExtMessage, MsgPageData, ShopMetaJson, ShopifyApp, StoreContacts } from '../types'
import { APPS_CATALOG_JSON_URL } from '../config/appsCatalog'

declare const __APP_MODE__: string
const IS_DEV = __APP_MODE__ === 'development'

function log(...args: unknown[]) {
  if (IS_DEV) console.log('[SpyKit CS]', ...args)
}

function toastFromContent(message: string) {
  try {
    void chrome.runtime.sendMessage({
      type: 'SPYKIT_TOAST',
      from: 'content',
      payload: { message },
    } satisfies ExtMessage)
  } catch {
    /* popup closed / runtime unavailable */
  }
}

// ─── Shopify detection ───────────────────────────────────────────────────────

function isShopify(): boolean {
  // Most reliable heuristics (order of confidence)
  if (document.querySelector('meta[name="shopify-checkout-api-token"]')) return true
  if (document.querySelector('link[rel="canonical"][href*="myshopify.com"]')) return true
  if (
    document.querySelector('script[src*="cdn.shopify.com"]') ||
    document.querySelector('script[src*="shopifycloud.com"]')
  )
    return true
  const gen = document.querySelector('meta[name="generator"]')
  if (gen?.getAttribute('content')?.toLowerCase().includes('shopify')) return true
  return false
}

// ─── Canonical domain ─────────────────────────────────────────────────────────

/**
 * The canonical store identifier — set to `shopMeta.myshopify_domain` once
 * `/meta.json` loads (gives `aedev.myshopify.com` even on custom domains),
 * falling back to `location.hostname`.  All background messages use this key
 * so they land in the same `storeCacheByDomain` slot regardless of which URL
 * variant the user opened.
 */
let canonicalDomain: string = location.hostname

type PageWorldState = 'off' | 'loading' | 'ready'
let pageWorldState: PageWorldState = 'off'
/** Set after `runStandaloneDetectorInContent`; `undefined` = do not overwrite cached apps on PAGE_DATA relay. */
let latestDetectedApps: ShopifyApp[] | undefined = undefined
let latestStandaloneResult: Record<string, unknown> | null = null

// ─── Page-world injection ────────────────────────────────────────────────────

function resolveAppsJsonUrl(): string {
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'))
  for (const s of scripts) {
    const src = s.src || ''
    const m = src.match(/\/cdn\/shop\/t\/(\d+)\//)
    if (m?.[1]) return `${window.location.origin}/cdn/shop/t/${m[1]}/assets/apps.json`
  }
  return APPS_CATALOG_JSON_URL
}

async function runStandaloneDetectorInContent(): Promise<{
  result: Record<string, unknown>
  apps: ShopifyApp[]
}> {
  const dynamicAppsJsonUrl = resolveAppsJsonUrl()
  let appsJsonUrl = dynamicAppsJsonUrl

  let response = await fetch(appsJsonUrl, { cache: 'no-store' })
  if (!response.ok && appsJsonUrl !== APPS_CATALOG_JSON_URL) {
    console.log('[SpyKit CS] apps.json not found on current store, falling back to canonical catalog', {
      tried: appsJsonUrl,
      status: response.status,
    })
    appsJsonUrl = APPS_CATALOG_JSON_URL
    response = await fetch(appsJsonUrl, { cache: 'no-store' })
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch app catalog: ${response.status} ${response.statusText}`)
  }
  const appCatalog = (await response.json()) as any[]
  if (!Array.isArray(appCatalog)) {
    throw new Error('Invalid app catalog format: expected an array')
  }

  const allScripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script'))
  const allLinks = Array.from(document.querySelectorAll<HTMLLinkElement>('link[href]'))
  const detectedApps: any[] = []
  const detectedByKey = new Map<string, any>()

  const getAppName = (app: any) =>
    app.appTitle || app.name || (app.id != null ? `App #${String(app.id)}` : 'Unknown App')

  const getAppCategory = (app: any) => {
    const category = app.category
    if (typeof category === 'string' && category.trim() !== '') return category
    const categoriesJson = app.categoriesJson
    if (typeof categoriesJson === 'string' && categoriesJson.trim() !== '') {
      try {
        const parsed = JSON.parse(categoriesJson)
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') return parsed[0]
      } catch {
        /* ignore */
      }
    }
    return 'Uncategorized'
  }

  const getAppPatterns = (app: any) =>
    Array.isArray(app.patterns) ? app.patterns.map((p: unknown) => String(p)) : []

  const getAppKey = (app: any) => (app.id != null ? String(app.id) : getAppName(app))

  const matchCatalogApp = (srcOrContent: string) => {
    const lower = String(srcOrContent).toLowerCase()
    for (const app of appCatalog) {
      for (const p of getAppPatterns(app)) {
        if (lower.includes(String(p).toLowerCase())) return app
      }
    }
    return null
  }

  const domDetectionScripts = (app: any) => {
    const selectors = Array.isArray(app.domSelectors) ? app.domSelectors : []
    const parts = []
    for (const selector of selectors) {
      try {
        const count = document.querySelectorAll(String(selector)).length
        if (count > 0) parts.push(`(DOM: ${count} x ${String(selector)})`)
      } catch {
        /* ignore */
      }
    }
    return parts
  }

  const getMatchingScriptSrcs = (app: any) => {
    const srcs: string[] = []
    for (const pattern of getAppPatterns(app)) {
      const normalizedPattern = String(pattern).toLowerCase()
      allScripts.forEach((script) => {
        if (script.getAttribute('src') == null) return
        const src = script.src || ''
        if (!src || !src.toLowerCase().includes(normalizedPattern)) return
        srcs.push(src)
      })
      allLinks.forEach((link) => {
        const hrefAttr = link.getAttribute('href')
        if (hrefAttr == null || hrefAttr === '') return
        const resolved = link.href || ''
        if (!resolved.toLowerCase().includes(normalizedPattern) && !hrefAttr.toLowerCase().includes(normalizedPattern)) {
          return
        }
        srcs.push(resolved || hrefAttr || '(link)')
      })
    }
    return [...new Set(srcs)]
  }

  const addOrMergeDetectedApp = (app: any, scriptsToAdd: string[]) => {
    const appKey = getAppKey(app)
    const appName = getAppName(app)
    const appCategory = getAppCategory(app)
    const appStoreUrl = app.sourceAppUrl || null
    const appIconUrl = app.appIconUrl || null

    if (!detectedByKey.has(appKey)) {
      const entry = {
        ...app,
        id: app.id != null ? app.id : null,
        name: appName,
        category: appCategory,
        sourceAppUrl: appStoreUrl,
        appIconUrl,
        scripts: [],
      }
      detectedApps.push(entry)
      detectedByKey.set(appKey, entry)
    }

    const entry = detectedByKey.get(appKey)
    const existing = new Set(Array.isArray(entry.scripts) ? entry.scripts : [])
    for (const s of scriptsToAdd) {
      if (typeof s === 'string' && s !== '' && !existing.has(s)) {
        entry.scripts.push(s)
        existing.add(s)
      }
    }
  }

  for (const app of appCatalog) {
    const matchingSrcs = getMatchingScriptSrcs(app)
    const domScripts = domDetectionScripts(app)
    const scripts = matchingSrcs.concat(domScripts)
    if (scripts.length > 0) addOrMergeDetectedApp(app, scripts)
  }

  const unknownSrcSet = new Set<string>()
  allScripts.forEach((script) => {
    if (!script.src) return
    const src = script.src
    const isShopify = src.includes('shopify.com') && (src.includes('extensions') || src.includes('proxy') || src.includes('apps'))
    const hasShop = src.includes('.js') && src.includes('?shop=')
    if (!isShopify && !hasShop) return
    unknownSrcSet.add(src)
  })
  unknownSrcSet.forEach((src) => {
    const matchedApp = matchCatalogApp(src)
    if (matchedApp) addOrMergeDetectedApp(matchedApp, [src])
  })

  const sectionStoreCount = document.querySelectorAll("[id*='shopify-section'] > [class*='_ss_'][class*='section-template']").length
  if (sectionStoreCount > 0) {
    addOrMergeDetectedApp(
      { id: 'sections-store-dom', appTitle: 'Sections Store', category: 'Page Builders' },
      [`(DOM: ${sectionStoreCount} section-template elements)`],
    )
  }

  const totalStylesheets = document.querySelectorAll("link[rel='stylesheet']").length
  const headScripts = document.head ? document.head.querySelectorAll('script') : []
  const bodyScripts = document.body ? document.body.querySelectorAll('script') : []
  const appsObject: Record<string, unknown> = {}
  const allDetectedScriptSrcs = new Set<string>()
  detectedApps.forEach((app) => {
    const scripts = Array.isArray(app.scripts) ? app.scripts : []
    appsObject[String(app.name)] = { ...app, scripts }
    scripts.forEach((src: any) => {
      if (typeof src === 'string' && src.startsWith('http')) allDetectedScriptSrcs.add(src)
    })
  })

  const result = {
    url: window.location.href,
    source_apps_url: appsJsonUrl,
    catalog_total: appCatalog.length,
    detected_apps: detectedApps,
    apps: appsObject,
    total_detected: detectedApps.length,
    total_head_scripts: headScripts.length,
    total_body_scripts: bodyScripts.length,
    total_scripts: headScripts.length + bodyScripts.length,
    total_stylesheets: totalStylesheets,
    section_store_count: sectionStoreCount,
    detected_script_srcs: Array.from(allDetectedScriptSrcs),
  }

  console.log('[SpyKit CS] app-standalone result', result)
  return {
    result: result as Record<string, unknown>,
    apps: detectedApps as ShopifyApp[],
  }
}

/** Shopify exposes shop metadata at the storefront root: `/meta.json`. */
async function fetchAndSendShopMeta(): Promise<void> {
  try {
    toastFromContent('Fetching store data…')
    const url = new URL('/meta.json', location.href).href
    const res = await fetch(url, { credentials: 'same-origin' })
    if (!res.ok) return
    const shopMeta = (await res.json()) as ShopMetaJson

    // Use myshopify_domain as the canonical key — consistent across custom domains
    canonicalDomain =
      typeof shopMeta.myshopify_domain === 'string' && shopMeta.myshopify_domain.trim()
        ? shopMeta.myshopify_domain.trim().toLowerCase()
        : location.hostname

    chrome.runtime.sendMessage({
      type: 'SHOP_META',
      from: 'content',
      payload: { domain: canonicalDomain, shopMeta },
    } satisfies ExtMessage)
  } catch {
    /* non-Shopify theme, offline, CORS edge, etc. */
  }
}

// ─── Store contacts (social links + emails from storefront DOM) ───────────────

/** Reads social profile links and contact emails from the current page DOM. */
function collectStoreContacts(): StoreContacts {
  const socialRules: Record<string, { pattern: RegExp; blacklist: string[] }> = {
    instagram: { pattern: /instagram\.com\//, blacklist: ['/p/', '/reel/', '/explore/', '/stories/'] },
    facebook:  { pattern: /facebook\.com\//, blacklist: ['/sharer', '/share', '/dialog/', '/watch/', '/groups/'] },
    twitter:   { pattern: /twitter\.com\//, blacklist: ['/share', '/intent/', '/hashtag/'] },
    x:         { pattern: /x\.com\//, blacklist: ['/share', '/intent/', '/i/'] },
    tiktok:    { pattern: /tiktok\.com\/@/, blacklist: [] },
    youtube:   { pattern: /youtube\.com\/(channel\/|c\/|@|user\/)/, blacklist: ['/watch', '/shorts/', '/playlist', '/embed/'] },
    pinterest: { pattern: /pinterest\.com\//, blacklist: ['/pin/', '/search/', '/explore/'] },
    linkedin:  { pattern: /linkedin\.com\/(company|in)\//, blacklist: ['/sharing/', '/share'] },
    snapchat:  { pattern: /snapchat\.com\/add\//, blacklist: [] },
    vimeo:     { pattern: /vimeo\.com\/(channels\/|groups\/|[a-zA-Z][a-zA-Z0-9]+)/, blacklist: ['/video/', '/ondemand/', '/showcase/'] },
    discord:   { pattern: /discord\.(gg|com\/invite)\//, blacklist: [] },
  }

  const emailBlacklist = [
    'sentry.io', 'example.com', 'yourdomain', 'domain.com',
    'shopify.com', 'cdn.shopify', 'wixpress.com', 'test.com',
  ]
  const emailPattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

  const social: Record<string, string> = {}
  const emailsFound = new Set<string>()

  document.querySelectorAll('a[href]').forEach((el) => {
    const href = (el as HTMLAnchorElement).getAttribute('href') || ''
    for (const [platform, rules] of Object.entries(socialRules)) {
      if (social[platform]) continue
      if (!rules.pattern.test(href)) continue
      if (rules.blacklist.some((b) => href.includes(b))) continue
      social[platform] = href
    }
  })

  document.querySelectorAll('a[href^="mailto:"]').forEach((el) => {
    const raw = (el as HTMLAnchorElement).getAttribute('href') || ''
    const email = raw.replace('mailto:', '').split('?')[0].trim().toLowerCase()
    if (email && !email.includes('@js.') && !emailBlacklist.some((ex) => email.includes(ex))) {
      emailsFound.add(email)
    }
  })

  const bodyText = document.body?.innerText || ''
  for (const e of bodyText.match(emailPattern) || []) {
    const normalized = e.toLowerCase()
    if (normalized.includes('@js.')) continue
    if (!emailBlacklist.some((ex) => normalized.includes(ex))) emailsFound.add(normalized)
  }

  return { social, emails: [...emailsFound] }
}

function sendStoreContacts() {
  try {
    toastFromContent('Scanning social links & emails…')
    const contacts = collectStoreContacts()
    // Use the same canonical domain that SHOP_META used (set after /meta.json loads)
    chrome.runtime.sendMessage({
      type: 'STORE_CONTACTS',
      from: 'content',
      payload: { domain: canonicalDomain, contacts },
    } satisfies ExtMessage)
    log('Sent STORE_CONTACTS', { emails: contacts.emails.length, socials: Object.keys(contacts.social) })
  } catch {
    /* ignore */
  }
}

/**
 * Full Shopify-side collection: page-world (theme, lightweight apps), `meta.json`
 * (canonical domain + shop name in background), catalog-based app detection, contacts.
 * Call only from `SPYKIT_RUN_SHOP_SCAN` or `SPYKIT_FORCE_REFRESH`, not on load.
 */
function runFullShopScan(opts: { fromForce?: boolean } = {}): void {
  if (!isShopify()) return

  // Page-world posts `PAGE_DATA` (theme + raw theme). Run it before any slow work
  // (standalone app detector) so the cache gets a theme row while that work runs.
  ensurePageWorld()

  try {
    chrome.runtime.sendMessage({
      type: 'STORE_DETECTED',
      from: 'content',
      payload: { domain: location.hostname, tabId: 0 },
    } satisfies ExtMessage)
  } catch {
    /* ignore */
  }

  void fetchAndSendShopMeta()
  if (opts.fromForce) {
    sendStoreContacts()
  }
  setTimeout(() => {
    sendStoreContacts()
  }, 2000)
  if (opts.fromForce) {
    setTimeout(() => {
      sendStoreContacts()
    }, 2200)
  }
}

async function runFullShopScanAndWaitForResult(): Promise<{
  apps: ShopifyApp[]
  result: Record<string, unknown> | null
}> {
  runFullShopScan()
  const { result, apps } = await runStandaloneDetectorInContent()
  latestStandaloneResult = result
  latestDetectedApps = apps
  ensurePageWorld()
  return { apps, result }
}

/**
 * First call: inject `page-world.js` (MAIN world) once. Later calls: ask it to
 * re-read theme and post `PAGE_DATA` without stacking duplicate scripts / fetch
 * patches.
 */
function ensurePageWorld(): void {
  if (pageWorldState === 'ready') {
    window.postMessage({ __spykit: true, type: 'SPYKIT_RERUN_PAGE_DATA' }, '*')
    return
  }
  if (pageWorldState === 'loading') {
    return
  }
  pageWorldState = 'loading'
  const script = document.createElement('script')
  script.src = chrome.runtime.getURL('assets/page-world.js')
  script.type = 'module'
  script.dataset['spykit'] = '1'
  script.onload = () => {
    script.remove()
    pageWorldState = 'ready'
  }
  script.onerror = () => {
    pageWorldState = 'off'
  }
  ;(document.head ?? document.documentElement).appendChild(script)
  log('Injected page-world script')
}

/** Next `PAGE_DATA` posted by injected `page-world.js` (not the content relay). */
function waitForNextInjectedPageData(timeoutMs: number): Promise<MsgPageData['payload']> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => {
      window.removeEventListener('message', onMsg)
      reject(new Error(`timeout after ${timeoutMs}ms waiting for PAGE_DATA from page world`))
    }, timeoutMs)
    const onMsg = (ev: MessageEvent) => {
      if (ev.source !== window || !ev.data || ev.data.__spykit !== true) return
      const msg = ev.data as ExtMessage
      if (msg.type !== 'PAGE_DATA' || msg.from !== 'injected') return
      window.clearTimeout(t)
      window.removeEventListener('message', onMsg)
      resolve((msg as MsgPageData).payload)
    }
    window.addEventListener('message', onMsg)
  })
}

// ─── Message bridge (page → content → background) ────────────────────────────

window.addEventListener('message', (event) => {
  if (
    event.source !== window ||
    !event.data ||
    event.data.__spykit !== true
  ) {
    return
  }

  const msg = event.data as ExtMessage
  log('Relay from page world:', msg.type)

  if (msg.type === 'PAGE_DATA') {
    const m = msg as MsgPageData
    const p = m.payload
    const mergedApps =
      latestDetectedApps !== undefined
        ? latestDetectedApps
        : p.apps && p.apps.length > 0
          ? p.apps
          : undefined
    // Do not spread `event.data` — it includes `__spykit`; send a clean MV3 message.
    // Store display name comes from `/meta.json` (`SHOP_META`), not meta author.
    chrome.runtime.sendMessage({
      type: 'PAGE_DATA',
      from: 'content',
      payload: {
        domain: p.domain,
        theme: p.theme,
        ...(mergedApps !== undefined ? { apps: mergedApps } : {}),
        productCount: p.productCount,
        collectionCount: p.collectionCount,
        catalogLoading: p.catalogLoading,
        shopifyThemeRaw: p.shopifyThemeRaw,
        standaloneResult: latestStandaloneResult ?? p.standaloneResult ?? null,
        productsSample: p.productsSample,
        collectionsSample: p.collectionsSample,
      },
    } satisfies ExtMessage)
    return
  }

  chrome.runtime.sendMessage(msg)
})

// ─── Init (no scan on page load; popup or manual refresh triggers work) ─────

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const m = message as { type?: string }
  if (m?.type === 'SPYKIT_CS_PING') {
    sendResponse({ ok: true, spykit: true } as const)
    return false
  }
  if (m?.type === 'SPYKIT_FETCH_PAGE_CONTEXT') {
    void (async () => {
      try {
        // ── 1. DOM snapshot (isolated world has full DOM access) — sync, no network ──
        const scriptSrcs = Array.from(
          document.querySelectorAll<HTMLScriptElement>('script[src]'),
        )
          .map((s) => s.src)
          .filter(Boolean)

        const linkHrefs = Array.from(
          document.querySelectorAll<HTMLLinkElement>('link[href]'),
        )
          .map((l) => {
            const resolved = l.href
            const attr = l.getAttribute('href') ?? ''
            return resolved && resolved !== window.location.href && resolved !== 'about:blank'
              ? resolved
              : attr
          })
          .filter(Boolean)

        const inlineScripts = Array.from(
          document.querySelectorAll<HTMLScriptElement>('script:not([src])'),
        )
          .map((s) => s.textContent?.slice(0, 3_000) ?? '')
          .filter(Boolean)

        const headHtml = document.head?.innerHTML ?? ''

        // ── 2. MAIN world globals (window.Shopify) via page-world bridge ──
        // Register the listener BEFORE calling ensurePageWorld so we don't miss the event.
        const pageDataPromise = waitForNextInjectedPageData(12_000)
        ensurePageWorld()
        const pageData = await pageDataPromise

        try {
          sendResponse({
            ok: true,
            domain: pageData.domain,
            theme: pageData.theme,
            shopifyThemeRaw: pageData.shopifyThemeRaw,
            scriptSrcs,
            linkHrefs,
            inlineScripts,
            headHtml,
            url: location.href,
          } as const)
        } catch {
          /* message channel already closed */
        }
      } catch (e) {
        try {
          sendResponse({ ok: false, error: String(e) } as const)
        } catch {
          /* message channel already closed */
        }
      }
    })()
    return true
  }
  if (m?.type === 'SPYKIT_DEBUG_FETCH_THEME') {
    if (!isShopify()) {
      sendResponse({ ok: false, error: 'not_shopify' } as const)
      return false
    }
    void (async () => {
      try {
        const payloadPromise = waitForNextInjectedPageData(25_000)
        ensurePageWorld()
        const payload = await payloadPromise
        try {
          sendResponse({
            ok: true,
            theme: payload.theme,
            shopifyThemeRaw: payload.shopifyThemeRaw,
            domain: payload.domain,
          } as const)
        } catch {
          /* message channel already closed */
        }
      } catch (e) {
        try {
          sendResponse({ ok: false, error: String(e) } as const)
        } catch {
          /* message channel already closed */
        }
      }
    })()
    return true
  }
  if (m?.type === 'SPYKIT_DEBUG_FETCH_APPS') {
    if (!isShopify()) {
      sendResponse({ ok: false, error: 'not_shopify' } as const)
      return false
    }
    void (async () => {
      let responded = false
      const reply = (
        out:
          | {
              ok: true
              apps: ShopifyApp[]
              domain: string
              standaloneResult: Record<string, unknown> | null
            }
          | { ok: false; error: string },
      ) => {
        if (responded) return
        responded = true
        try {
          sendResponse(out)
        } catch {
          /* message channel already closed */
        }
      }
      try {
        const { apps, result } = await runStandaloneDetectorInContent()
        latestStandaloneResult = result
        latestDetectedApps = apps
        const payload = await new Promise<MsgPageData['payload']>((resolve, reject) => {
          const t = window.setTimeout(() => {
            window.removeEventListener('message', onMsg)
            reject(new Error('timeout waiting for PAGE_DATA after app scan'))
          }, 25_000)
          function onMsg(ev: MessageEvent) {
            if (ev.source !== window || !ev.data || ev.data.__spykit !== true) return
            const msg = ev.data as ExtMessage
            if (msg.type !== 'PAGE_DATA' || msg.from !== 'injected') return
            window.clearTimeout(t)
            window.removeEventListener('message', onMsg)
            resolve((msg as MsgPageData).payload)
          }
          window.addEventListener('message', onMsg)
          ensurePageWorld()
        })
        reply({
          ok: true,
          apps: latestDetectedApps ?? [],
          domain: payload.domain,
          standaloneResult: result,
        })
      } catch (e) {
        reply({ ok: false, error: String(e) })
      }
    })()
    return true
  }
  if (m?.type === 'SPYKIT_DEBUG_FETCH_HTML') {
    try {
      console.log('[SpyKit CS] SPYKIT_DEBUG_FETCH_HTML received', { url: location.href })
      const html = document.querySelector('html')?.innerHTML ?? ''
      console.log('[SpyKit CS] SPYKIT_DEBUG_FETCH_HTML responding', { htmlLength: html.length })
      sendResponse({ ok: true, html, url: location.href } as const)
    } catch (e) {
      console.warn('[SpyKit CS] SPYKIT_DEBUG_FETCH_HTML failed', e)
      sendResponse({ ok: false, error: String(e) } as const)
    }
    return false
  }
  if (m?.type === 'SPYKIT_DEBUG_HEAD_HTML') {
    try {
      const html = document.querySelector('head')?.innerHTML ?? ''
      sendResponse({
        type: 'SPYKIT_DEBUG_HEAD_HTML_RESPONSE',
        from: 'content',
        payload: { html, url: location.href },
      } satisfies ExtMessage)
    } catch (e) {
      sendResponse({ ok: false, error: String(e) } as const)
    }
    return false
  }
  if (m?.type === 'SPYKIT_RUN_SHOP_SCAN') {
    if (!isShopify()) {
      sendResponse({ ok: false, error: 'not_shopify' } as const)
      return false
    }
    void runFullShopScanAndWaitForResult()
      .then(({ apps, result }) => {
        try {
          sendResponse({ ok: true, apps, result } as const)
        } catch {
          /* message channel already closed */
        }
      })
      .catch((e) => {
        try {
          sendResponse({ ok: false, error: String(e) } as const)
        } catch {
          /* message channel already closed */
        }
      })
    return true
  }
  if (m?.type !== 'SPYKIT_FORCE_REFRESH') return false
  if (!isShopify()) {
    sendResponse({ ok: false, error: 'not_shopify' })
    return false
  }
  void (async () => {
    try {
      runFullShopScan({ fromForce: true })
      try {
        const { result, apps } = await runStandaloneDetectorInContent()
        latestStandaloneResult = result
        latestDetectedApps = apps
      } catch {
        /* ignore and continue with page-world/theme refresh */
      }
      ensurePageWorld()
      try {
        sendResponse({ ok: true })
      } catch {
        /* message channel already closed */
      }
    } catch (e) {
      try {
        sendResponse({ ok: false, error: String(e) })
      } catch {
        /* message channel already closed */
      }
    }
  })()
  return true
})
