/**
 * Passed to `chrome.scripting.executeScript` (`world: 'MAIN'`).
 * Must be self-contained — no imports or outer closures (Chrome serializes `func`).
 * Mirrors `page-world.js` theme read / extract.
 */
export async function extractShopifyThemeMainWorld(): Promise<
  | {
      ok: true
      domain: string
      theme: Record<string, unknown>
      shopifyThemeRaw: Record<string, unknown> | null
    }
  | { ok: false; error: string }
> {
  function cloneShopifyTheme(theme: unknown): Record<string, unknown> | null {
    if (!theme || typeof theme !== 'object') return null
    try {
      return JSON.parse(JSON.stringify(theme)) as Record<string, unknown>
    } catch {
      return null
    }
  }

  function extractTheme(theme: unknown): Record<string, unknown> {
    if (!theme || typeof theme !== 'object') return {}
    const t = theme as Record<string, unknown>
    const sn = t.schema_name
    const name = sn != null && String(sn).trim() ? String(sn).trim() : 'Unknown'
    const themeRenamed = t.name != null ? String(t.name) : undefined
    const version =
      t.schema_version != null && t.schema_version !== '' ? String(t.schema_version) : ''
    const shopify = (window as unknown as { Shopify?: { sections?: unknown } }).Shopify
    const isOS2 = Boolean(shopify?.sections) || Boolean(sn)

    return {
      name,
      themeRenamed,
      themeId: typeof t.id === 'number' ? t.id : undefined,
      schemaName: t.schema_name ?? null,
      schemaVersion: t.schema_version != null ? String(t.schema_version) : null,
      themeStoreId: t.theme_store_id ?? null,
      role: t.role ?? null,
      themeHandle: t.handle == null || t.handle === 'null' ? null : String(t.handle),
      version,
      author: 'Shopify',
      isOS2,
    }
  }

  await new Promise<void>((resolve) => {
    const start = Date.now()
    const maxMs = 12_000
    const tick = () => {
      const th = (window as unknown as { Shopify?: { theme?: unknown } }).Shopify?.theme
      if (th) {
        resolve()
        return
      }
      if (Date.now() - start >= maxMs) {
        resolve()
        return
      }
      setTimeout(tick, 150)
    }
    tick()
  })

  const win = window as unknown as { Shopify?: { theme?: unknown; shop?: unknown } }
  const rawTheme = win.Shopify?.theme ?? null
  const shopifyThemeRaw = cloneShopifyTheme(rawTheme)
  const theme = extractTheme(rawTheme)
  const shop = win.Shopify?.shop
  const domain =
    typeof shop === 'string' && shop.trim() ? shop.trim() : window.location.hostname

  if (!rawTheme && Object.keys(theme).length === 0) {
    return { ok: false, error: 'no_shopify_theme_on_page' }
  }

  return { ok: true, domain, theme, shopifyThemeRaw }
}
