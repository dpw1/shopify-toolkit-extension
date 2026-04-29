/**
 * Map ISO 3166-1 alpha-2 (lowercase) → bundled `country-flag-icons` SVG URLs.
 * We keep both aspect sets:
 *  - `3x2` for rectangle flags
 *  - `1x1` for square flags
 */
const modules3x2 = import.meta.glob<string>(
  '../../../node_modules/country-flag-icons/3x2/*.svg?url',
  { eager: true, import: 'default' },
)
const modules1x1 = import.meta.glob<string>(
  '../../../node_modules/country-flag-icons/1x1/*.svg?url',
  { eager: true, import: 'default' },
)

function buildCodeToUrlMap(modules: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [path, url] of Object.entries(modules)) {
    // Vite keys can be POSIX/Windows-like and may include `?url`.
    const m = path.match(/[\\/](?<code>[A-Za-z0-9-]+)\.svg(?:\?.*)?$/)
    if (m?.[1] && typeof url === 'string') {
      out[m[1].toLowerCase()] = url
    }
  }
  return out
}

const codeToUrl3x2 = buildCodeToUrlMap(modules3x2)
const codeToUrl1x1 = buildCodeToUrlMap(modules1x1)

/**
 * Territories / Shopify quirks: `country-flag-icons` has no asset (e.g. `ac.svg` missing).
 * Map to a bundled ISO code for reliable display.
 */
const BUNDLE_FLAG_CODE_ALIAS: Record<string, string> = {
  // Ascension Island — not shipped as `ac` in older icon sets; UK flag is a stable fallback.
  ac: 'gb',
}

export function getFlagAssetUrl(iso2Lower: string, square = false): string | undefined {
  const code = iso2Lower.toLowerCase()
  const bundleKey = BUNDLE_FLAG_CODE_ALIAS[code] ?? code
  return square ? (codeToUrl1x1[bundleKey] ?? codeToUrl3x2[bundleKey]) : codeToUrl3x2[bundleKey]
}

export function getShipFlagAssetUrl(iso2Lower: string): string | undefined {
  return getFlagAssetUrl(iso2Lower, false)
}

export function getFlagCdnUrl(iso2Lower: string): string {
  const code = iso2Lower.toLowerCase()
  const key = BUNDLE_FLAG_CODE_ALIAS[code] ?? code
  return `https://flagcdn.com/${key}.svg`
}
