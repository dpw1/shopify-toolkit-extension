import type { ShopifyTheme, StoreInfo } from '../../types'
import { THEMES_CATALOG_JSON_URL } from '../../config/themesCatalog'
import { getResolvedThemeForUI } from './themeFromStoreInfo'

export type ThemeJsonReviews = {
  totalReviews?: number
  positiveCount?: number
  neutralCount?: number
  negativeCount?: number
  reviewURL?: string
}

export type ThemeJsonEntry = {
  themeURL?: string
  title?: string
  price?: string
  description?: string
  creator?: string
  livedemo?: string
  liveDemo?: string
  live_demo?: string
  demoURL?: string
  desktopImage?: string
  mobileImage?: string
  fetch_date?: string
  reviews?: ThemeJsonReviews
  themeName?: string
  themePrice?: string
  img?: string
}

function normKey(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Match catalog JSON to the live theme:
 * primary — `schema_name` from Shopify (lowercase) equals JSON `title` (lowercase), or the object key;
 * secondary — display name / renamed folder for edge cases.
 */
export function pickThemeJsonEntry(
  data: Record<string, ThemeJsonEntry>,
  resolved: ShopifyTheme | null,
): ThemeJsonEntry | null {
  if (!resolved) return null

  const schemaNameRaw =
    (resolved.schemaName != null && String(resolved.schemaName).trim()
      ? String(resolved.schemaName).trim()
      : '') ||
    (resolved.name != null && String(resolved.name).trim() ? String(resolved.name).trim() : '')

  const schemaLc = normKey(schemaNameRaw)
  const displayLc = normKey(resolved.name ?? '')
  const renamedLc = resolved.themeRenamed ? normKey(resolved.themeRenamed) : ''

  if (!schemaLc && !displayLc && !renamedLc) return null

  const tryMatch = (needle: string): ThemeJsonEntry | null => {
    if (!needle) return null
    for (const [key, value] of Object.entries(data)) {
      const titleLc = normKey(value.title ?? value.themeName ?? '')
      const keyLc = normKey(key)
      if (titleLc === needle || keyLc === needle) return value
    }
    return null
  }

  // 1) schema_name ↔ JSON title / key (user-requested)
  const bySchema = tryMatch(schemaLc)
  if (bySchema) return bySchema

  // 2) UI display name (often same as schema_name but covers renames)
  const byDisplay = tryMatch(displayLc)
  if (byDisplay && displayLc !== schemaLc) return byDisplay

  const byRenamed = tryMatch(renamedLc)
  if (byRenamed && renamedLc !== schemaLc && renamedLc !== displayLc) return byRenamed

  return null
}

export type ResolvedThemeWithCatalog = {
  /** Part 1 — from `window.Shopify.theme` via persisted `StoreInfo` / cache */
  resolved: ShopifyTheme | null
  /** Part 2 — row from remote `themes.json` when a match is found */
  catalogEntry: ThemeJsonEntry | null
  themesJsonUrl: string
}

/**
 * Two-step theme enrichment:
 *  1. Resolve live theme from `storeInfo` (Shopify.theme / schema_name in cache).
 *  2. Fetch `THEMES_CATALOG_JSON_URL` and match JSON `title` (lowercase) + object keys to `schema_name`.
 */
export async function loadThemeWithJsonCatalog(
  storeInfo: StoreInfo | null,
  signal?: AbortSignal,
): Promise<ResolvedThemeWithCatalog> {
  const resolved = getResolvedThemeForUI(storeInfo)
  const themesJsonUrl = THEMES_CATALOG_JSON_URL

  if (!resolved) {
    return { resolved: null, catalogEntry: null, themesJsonUrl }
  }

  try {
    const res = await fetch(themesJsonUrl, { credentials: 'omit', signal })
    if (!res.ok) {
      console.warn('[SpyKit Theme] themes.json fetch failed', res.status, themesJsonUrl)
      return { resolved, catalogEntry: null, themesJsonUrl }
    }
    const data = (await res.json()) as Record<string, ThemeJsonEntry>
    const catalogEntry = pickThemeJsonEntry(data, resolved)
    console.log('[SpyKit Theme] themes.json match', {
      themesJsonUrl,
      schemaName: resolved.schemaName ?? resolved.name,
      matched: catalogEntry?.title ?? null,
    })
    return { resolved, catalogEntry, themesJsonUrl }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e
    console.warn('[SpyKit Theme] themes.json error', e)
    return { resolved, catalogEntry: null, themesJsonUrl }
  }
}
