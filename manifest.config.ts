import { defineManifest } from '@crxjs/vite-plugin'

/**
 * STORE vs DEV differences:
 *  - Omit the `key` field when building a zip for the Chrome Web Store.
 *    The key is only needed for local dev to keep the extension ID stable.
 *  - Set VITE_CRX_KEY in .env.local to your dev key.
 *  - The `content_security_policy` entry allows Google Fonts in extension pages.
 */
export default defineManifest((env) => ({
  manifest_version: 3,
  name: 'Shopify Spy Toolkit',
  version: '1.0.0',
  description: 'Spy on any Shopify store — detect theme, apps, products, and more.',

  // Uncomment and populate for local dev (omit when creating Web Store zip):
  // key: process.env.VITE_CRX_KEY,

  icons: {
    '16': 'icons/icon16.png',
    '32': 'icons/icon32.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },

  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '32': 'icons/icon32.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
    default_title: 'Shopify Spy Toolkit',
  },

  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },

  content_scripts: [
    {
      // Include `http://*/*` so local / non-TLS storefronts get the bridge (Theme debug, scans).
      matches: ['*://*.myshopify.com/*', 'https://*/*', 'http://*/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],

  web_accessible_resources: [
    {
      // page-world injected script — compiled to assets/page-world.js by Rollup.
      // Content script loads it via chrome.runtime.getURL('assets/page-world.js').
      resources: ['assets/page-world.js'],
      matches: ['*://*.myshopify.com/*', 'https://*/*', 'http://*/*'],
    },
    {
      resources: ['icons/*'],
      matches: ['<all_urls>'],
    },
  ],

  permissions: [
    'storage',
    'activeTab',
    'tabs',
    'windows',
    'scripting',
    'offscreen',
  ],

  host_permissions: [
    // Dev only: extension UI (popup) must be allowed to reach the Vite dev server for HMR + fetch.
    // Omitted from production builds (`vite build`) so store zips stay minimal.
    ...(env.command === 'serve'
      ? (['http://127.0.0.1/*', 'http://localhost/*'] as const)
      : []),
    '*://*.myshopify.com/*',
    'https://*/*',
    'http://*/*',
    '*://*/products.json',
    '*://*/collections.json',
  ],

  content_security_policy: {
    // Google Fonts + Vite dev (CRX loading-page fetch + HMR WebSockets on localhost).
    // Chrome 130+: include wasm-unsafe-eval where dynamic chunks are used.
    extension_pages: [
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https:",
      "connect-src 'self' https: http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:* wss://127.0.0.1:* wss://localhost:*",
    ].join('; '),
  },
}))
