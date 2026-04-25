/**
 * Map ISO 3166-1 alpha-2 (lowercase) → bundled `flag-icons` 4×3 SVG URL.
 * Vite resolves these at build time; `<img src>` is reliable in the extension UI.
 */
const modules = import.meta.glob<string>(
  '../../../node_modules/flag-icons/flags/4x3/*.svg?url',
  { eager: true, import: 'default' },
)

const codeToUrl: Record<string, string> = {}
for (const [path, url] of Object.entries(modules)) {
  const m = path.match(/\/([a-z0-9-]+)\.svg$/i)
  if (m?.[1] && typeof url === 'string') {
    codeToUrl[m[1].toLowerCase()] = url
  }
}

export function getShipFlagAssetUrl(iso2Lower: string): string | undefined {
  return codeToUrl[iso2Lower.toLowerCase()]
}
