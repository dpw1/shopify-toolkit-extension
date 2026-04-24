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

import type { ExtMessage } from '../types'

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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
