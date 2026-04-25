/**
 * Content script — runs in the isolated world on matching pages.
 *
 * Steps:
 *  1. Detect whether this is a Shopify store (check window.Shopify or meta tags).
 *  2. If yes, inject page-world.js into the page world so it can read
 *     unredacted window.Shopify globals and intercept fetch/XHR.
 *  3. Listen for messages from the injected script (via window.postMessage)
 *     and relay them to the background service worker.
 */

import type { ExtMessage, MsgPageData, ShopMetaJson, StoreContacts } from '../types'

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

// ─── Page-world injection ────────────────────────────────────────────────────

/** Shopify exposes shop metadata at the storefront root: `/meta.json`. */
async function fetchAndSendShopMeta(): Promise<void> {
  try {
    toastFromContent('Fetching meta.json…')
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
    if (email && !emailBlacklist.some((ex) => email.includes(ex))) {
      emailsFound.add(email)
    }
  })

  const bodyText = document.body?.innerText || ''
  for (const e of bodyText.match(emailPattern) || []) {
    if (!emailBlacklist.some((ex) => e.includes(ex))) emailsFound.add(e.toLowerCase())
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

function injectPageWorld() {
  const script = document.createElement('script')
  // Built as rollup input `page-world` → assets/page-world.js
  // The stable entryFileNames pattern in vite.config.ts guarantees this path.
  script.src = chrome.runtime.getURL('assets/page-world.js')
  script.type = 'module'
  script.dataset['spykit'] = '1'
  ;(document.head ?? document.documentElement).appendChild(script)
  script.onload = () => script.remove()
  log('Injected page-world script')
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
    // Do not spread `event.data` — it includes `__spykit`; send a clean MV3 message.
    // Store display name comes from `/meta.json` (`SHOP_META`), not meta author.
    chrome.runtime.sendMessage({
      type: 'PAGE_DATA',
      from: 'content',
      payload: {
        domain: p.domain,
        theme: p.theme,
        apps: p.apps,
        productCount: p.productCount,
        collectionCount: p.collectionCount,
        catalogLoading: p.catalogLoading,
        shopifyThemeRaw: p.shopifyThemeRaw,
        productsSample: p.productsSample,
        collectionsSample: p.collectionsSample,
      },
    } satisfies ExtMessage)
    return
  }

  chrome.runtime.sendMessage(msg)
})

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  if (!isShopify()) {
    log('Not a Shopify store — skipping')
    return
  }

  const domain = location.hostname

  log('Shopify store detected:', domain)

  chrome.runtime.sendMessage({
    type: 'STORE_DETECTED',
    from: 'content',
    payload: { domain, tabId: 0 },
  } satisfies ExtMessage)

  injectPageWorld()
  void fetchAndSendShopMeta()
  // Delay so lazy-loaded footer links / mailto tags are in the DOM
  setTimeout(sendStoreContacts, 2000)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
