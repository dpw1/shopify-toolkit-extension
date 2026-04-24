/**
 * Page-world injected script — MAIN world.
 * Reads `window.Shopify.theme` + apps; posts PAGE_DATA.
 * Product / collection counts are fetched when the user opens the popup (background + active tab origin).
 */

const _origFetch = window.fetch.bind(window)

function postToContent(data) {
  window.postMessage({ ...data, __spykit: true }, '*')
}

function waitForShopifyTheme(maxMs = 10000) {
  return new Promise((resolve) => {
    const start = Date.now()
    const tick = () => {
      const t = window.Shopify?.theme
      if (t) {
        resolve(t)
        return
      }
      if (Date.now() - start >= maxMs) {
        resolve(window.Shopify?.theme ?? null)
        return
      }
      setTimeout(tick, 150)
    }
    tick()
  })
}

function cloneShopifyTheme(theme) {
  if (!theme || typeof theme !== 'object') return null
  try {
    return JSON.parse(JSON.stringify(theme))
  } catch {
    return null
  }
}

function extractTheme(theme) {
  if (!theme) return {}
  const sn = theme.schema_name
  const name = sn != null && String(sn).trim() ? String(sn).trim() : 'Unknown'
  const themeRenamed = theme.name != null ? String(theme.name) : undefined
  const version =
    theme.schema_version != null && theme.schema_version !== ''
      ? String(theme.schema_version)
      : ''

  const shopify = window.Shopify
  const isOS2 = Boolean(shopify?.sections) || Boolean(sn)

  return {
    name,
    themeRenamed,
    themeId: typeof theme.id === 'number' ? theme.id : undefined,
    schemaName: theme.schema_name ?? null,
    schemaVersion: theme.schema_version != null ? String(theme.schema_version) : null,
    themeStoreId: theme.theme_store_id ?? null,
    role: theme.role ?? null,
    themeHandle: theme.handle == null || theme.handle === 'null' ? null : String(theme.handle),
    version,
    author: 'Shopify',
    isOS2,
  }
}

function extractApps() {
  const apps = []

  const scriptSrcs = Array.from(document.querySelectorAll('script[src]')).map(
    (el) => el.getAttribute('src') ?? '',
  )

  const patterns = [
    { pattern: /klaviyo/i, app: { name: 'Klaviyo', category: 'marketing', iconBg: '#111' } },
    { pattern: /loox/i, app: { name: 'Loox', category: 'reviews', iconBg: '#008080' } },
    {
      pattern: /smile\.io|sweettooth/i,
      app: { name: 'Smile: Loyalty & Rewards', category: 'marketing', iconBg: '#FFD700' },
    },
    { pattern: /yotpo/i, app: { name: 'Yotpo Reviews', category: 'reviews' } },
    { pattern: /recharge/i, app: { name: 'ReCharge Subscriptions', category: 'sales' } },
    { pattern: /privy/i, app: { name: 'Privy', category: 'marketing' } },
    { pattern: /gorgias/i, app: { name: 'Gorgias', category: 'other' } },
    { pattern: /hotjar/i, app: { name: 'Hotjar', category: 'analytics' } },
    {
      pattern: /google-analytics|googletagmanager/i,
      app: { name: 'Google & YouTube', category: 'analytics' },
    },
    { pattern: /omnisend/i, app: { name: 'Omnisend', category: 'marketing' } },
    { pattern: /judge\.me/i, app: { name: 'Judge.me Reviews', category: 'reviews' } },
    { pattern: /stamped/i, app: { name: 'Stamped Reviews', category: 'reviews' } },
    {
      pattern: /search\.app\.shopify/i,
      app: { name: 'Shopify Search & Discovery', category: 'sales', iconBg: '#ecfdf5' },
    },
  ]

  const allText = [...scriptSrcs, document.head.innerHTML].join('\n')

  patterns.forEach(({ pattern, app }) => {
    if (pattern.test(allText)) {
      apps.push({ id: app.name.toLowerCase().replace(/\s+/g, '-'), ...app })
    }
  })

  return apps
}

window.fetch = async function patchedFetch(input, init) {
  const url = typeof input === 'string' ? input : input.url
  const res = await _origFetch(input, init)

  if (/\/products\.json|\/collections.*\/products\.json/.test(url)) {
    res
      .clone()
      .json()
      .then((data) => {
        postToContent({
          type: 'PAGE_DATA_INTERCEPTED',
          from: 'injected',
          url,
          data,
        })
      })
      .catch(() => undefined)
  }

  return res
}

async function run() {
  await waitForShopifyTheme()
  const rawTheme = window.Shopify?.theme ?? null
  const shopifyThemeRaw = cloneShopifyTheme(rawTheme)
  const theme = extractTheme(rawTheme)
  const apps = extractApps()
  const shop = window.Shopify?.shop
  const domain =
    typeof shop === 'string' && shop.trim()
      ? shop.trim()
      : location.hostname

  postToContent({
    type: 'PAGE_DATA',
    from: 'injected',
    payload: {
      domain,
      theme,
      apps,
      shopifyThemeRaw,
    },
  })
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.error('[SpyKit page-world]', err)
  }
})()
