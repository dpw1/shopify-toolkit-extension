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

import type { ExtMessage, MsgPageData, ShopMetaJson } from '../types'

declare const __APP_MODE__: string
const IS_DEV = __APP_MODE__ === 'development'

function log(...args: unknown[]) {
  if (IS_DEV) console.log('[SpyKit CS]', ...args)
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

// ─── Page-world injection ────────────────────────────────────────────────────

/** Same as storefront: `<meta name="author" content="…">` (name matching is case-insensitive). */
function readStoreNameFromAuthorMeta(): string | undefined {
  for (const el of document.querySelectorAll('meta[name]')) {
    const name = el.getAttribute('name')
    if (!name || name.toLowerCase() !== 'author') continue
    const c = el.getAttribute('content')?.trim()
    if (c && c.length > 0) return c
  }
  return undefined
}

/** Shopify exposes shop metadata at the storefront root: `/meta.json`. */
async function fetchAndSendShopMeta(): Promise<void> {
  try {
    const url = new URL('/meta.json', location.href).href
    const res = await fetch(url, { credentials: 'same-origin' })
    if (!res.ok) return
    const shopMeta = (await res.json()) as ShopMetaJson
    chrome.runtime.sendMessage({
      type: 'SHOP_META',
      from: 'content',
      payload: { domain: location.hostname, shopMeta },
    } satisfies ExtMessage)
  } catch {
    /* non-Shopify theme, offline, CORS edge, etc. */
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
    // Re-read from this isolated world (same DOM as the page). Do not spread `event.data` — it
    // includes `__spykit`, which can confuse some paths; send a clean MV3 message.
    const storeNameFromContent = readStoreNameFromAuthorMeta()
    const storeName =
      storeNameFromContent ??
      (typeof p.storeName === 'string' && p.storeName.trim() ? p.storeName.trim() : undefined)

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
        ...(storeName != null ? { storeName } : {}),
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
