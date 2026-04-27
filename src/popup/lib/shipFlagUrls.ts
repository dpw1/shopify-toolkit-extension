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

export function getFlagAssetUrl(iso2Lower: string, square = false): string | undefined {
  const code = iso2Lower.toLowerCase()
  return square ? (codeToUrl1x1[code] ?? codeToUrl3x2[code]) : codeToUrl3x2[code]
}

export function getShipFlagAssetUrl(iso2Lower: string): string | undefined {
  return getFlagAssetUrl(iso2Lower, false)
}
