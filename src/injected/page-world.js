/**
 * Page-world injected script — MAIN world.
 * Reads `window.Shopify.theme` + apps; posts PAGE_DATA.
 * Product / collection counts are fetched when the user opens the popup (background + active tab origin).
 */

const _origFetch = window.fetch.bind(window)
const APPS_JSON_URL = 'https://pandatests.myshopify.com/cdn/shop/t/70/assets/apps.json'

function resolveAppsJsonUrl() {
  const scripts = Array.from(document.querySelectorAll('script[src]'))
  for (const s of scripts) {
    const src = s.src || ''
    const m = src.match(/\/cdn\/shop\/t\/(\d+)\//)
    if (m?.[1]) {
      return `${window.location.origin}/cdn/shop/t/${m[1]}/assets/apps.json`
    }
  }
  return APPS_JSON_URL
}

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

async function runStandaloneDetector() {
  console.log('APP - step 1 - start runStandaloneDetector')
  const appsJsonUrl = resolveAppsJsonUrl()
  console.log('APP - step 2 - resolved appsJsonUrl', appsJsonUrl)
  async function loadAppCatalog() {
    console.log('APP - step 3 - fetching apps catalog')
    const response = await fetch(appsJsonUrl, { cache: 'no-store' })
    if (!response.ok) {
      console.log('APP - step 3.1 - catalog fetch non-OK', response.status, response.statusText)
      throw new Error(`Failed to fetch app catalog: ${response.status} ${response.statusText}`)
    }
    const data = await response.json()
    if (!Array.isArray(data)) throw new Error('Invalid app catalog format: expected an array')
    console.log('APP - step 4 - catalog loaded', { total: data.length })
    return data
  }

  function getAppName(app) {
    return app.appTitle || app.name || (app.id != null ? `App #${app.id}` : 'Unknown App')
  }
  function getAppCategory(app) {
    if (typeof app.category === 'string' && app.category.trim() !== '') return app.category
    if (typeof app.categoriesJson === 'string' && app.categoriesJson.trim() !== '') {
      try {
        const parsed = JSON.parse(app.categoriesJson)
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          return parsed[0]
        }
      } catch {}
    }
    return 'Uncategorized'
  }
  function getAppPatterns(app) {
    return Array.isArray(app.patterns) ? app.patterns : []
  }
  function getAppKey(app) {
    if (app.id != null) return String(app.id)
    return getAppName(app)
  }

  const appCatalog = await loadAppCatalog()
  const allScripts = Array.from(document.querySelectorAll('script'))
  const allLinks = Array.from(document.querySelectorAll('link[href]'))
  console.log('APP - step 5 - collected DOM nodes', {
    scripts: allScripts.length,
    links: allLinks.length,
  })
  const detectedApps = []
  const detectedByKey = new Map()

  function matchCatalogApp(srcOrContent) {
    if (!srcOrContent) return null
    const lower = String(srcOrContent).toLowerCase()
    for (const app of appCatalog) {
      const patterns = getAppPatterns(app)
      for (const p of patterns) {
        if (lower.indexOf(String(p).toLowerCase()) !== -1) return app
      }
    }
    return null
  }

  function domDetectionScripts(app) {
    const selectors = Array.isArray(app.domSelectors) ? app.domSelectors : []
    const parts = []
    for (const selector of selectors) {
      try {
        const count = document.querySelectorAll(selector).length
        if (count > 0) parts.push(`(DOM: ${count} x ${selector})`)
      } catch {}
    }
    return parts
  }

  function getMatchingScriptSrcs(app) {
    const srcs = []
    const patterns = getAppPatterns(app)
    for (const pattern of patterns) {
      const normalizedPattern = String(pattern).toLowerCase()
      allScripts.forEach((script) => {
        if (script.getAttribute('src') == null) return
        const src = script.src || ''
        if (!src || src.toLowerCase().indexOf(normalizedPattern) === -1) return
        srcs.push(src)
      })
      allLinks.forEach((link) => {
        const hrefAttr = link.getAttribute('href')
        if (hrefAttr == null || hrefAttr === '') return
        const resolved = link.href || ''
        if (
          resolved.toLowerCase().indexOf(normalizedPattern) === -1 &&
          hrefAttr.toLowerCase().indexOf(normalizedPattern) === -1
        ) {
          return
        }
        srcs.push(resolved || hrefAttr || '(link)')
      })
    }
    return [...new Set(srcs)]
  }

  function addOrMergeDetectedApp(app, scriptsToAdd) {
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
        appIconUrl: appIconUrl,
        scripts: [],
      }
      detectedApps.push(entry)
      detectedByKey.set(appKey, entry)
    }

    const entry = detectedByKey.get(appKey)
    const existing = new Set(entry.scripts)
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
  console.log('APP - step 6 - catalog scan complete', {
    detectedAfterCatalogPass: detectedApps.length,
  })

  const unknownSrcSet = new Set()
  allScripts.forEach((script) => {
    if (!script.src) return
    const src = script.src
    const isShopify =
      src.indexOf('shopify.com') !== -1 &&
      (src.indexOf('extensions') !== -1 || src.indexOf('proxy') !== -1 || src.indexOf('apps') !== -1)
    const hasShop = src.indexOf('.js') !== -1 && src.indexOf('?shop=') !== -1
    if (!isShopify && !hasShop) return
    unknownSrcSet.add(src)
  })
  unknownSrcSet.forEach((src) => {
    const matchedApp = matchCatalogApp(src)
    if (matchedApp) addOrMergeDetectedApp(matchedApp, [src])
  })
  console.log('APP - step 7 - unknown script matching complete', {
    unknownScriptCandidates: unknownSrcSet.size,
    detectedAfterUnknownPass: detectedApps.length,
  })

  const sectionStoreCount = document.querySelectorAll(
    "[id*='shopify-section'] > [class*='_ss_'][class*='section-template']",
  ).length
  if (sectionStoreCount > 0) {
    addOrMergeDetectedApp(
      { id: 'sections-store-dom', appTitle: 'Sections Store', category: 'Page Builders' },
      [`(DOM: ${sectionStoreCount} section-template elements)`],
    )
  }
  console.log('APP - step 8 - section store check complete', {
    sectionStoreCount,
    detectedAfterSectionCheck: detectedApps.length,
  })

  const totalStylesheets = document.querySelectorAll("link[rel='stylesheet']").length
  const headScripts = document.head ? document.head.querySelectorAll('script') : []
  const bodyScripts = document.body ? document.body.querySelectorAll('script') : []
  const appsObject = {}
  const allDetectedScriptSrcs = new Set()
  detectedApps.forEach((app) => {
    const scripts = Array.isArray(app.scripts) ? app.scripts : []
    appsObject[app.name] = { ...app, scripts }
    scripts.forEach((src) => {
      if (typeof src === 'string' && src.indexOf('http') === 0) allDetectedScriptSrcs.add(src)
    })
  })
  console.log('APP - step 9 - built appsObject', {
    detectedApps: detectedApps.length,
    uniqueDetectedScriptSrcs: allDetectedScriptSrcs.size,
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

  console.log('APP - step 10 - final result ready', {
    total_detected: result.total_detected,
    catalog_total: result.catalog_total,
    source_apps_url: result.source_apps_url,
  })
  console.log('[SpyKit app-standalone] result', result)
  window.__shopifyApps = result
  console.log('APP - step 11 - stored window.__shopifyApps and returning result')
  return result
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
  const apps = []
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
      standaloneResult: null,
    },
  })
}

window.addEventListener('message', (event) => {
  const d = event.data
  if (!d || d.__spykit !== true || d.type !== 'SPYKIT_RERUN_PAGE_DATA') return
  void run().catch((err) => console.error('[SpyKit page-world] rerun', err))
})

;(async () => {
  try {
    await run()
  } catch (err) {
    console.error('[SpyKit page-world]', err)
  }
})()
