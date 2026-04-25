import countryData from 'flag-icons/country.json'

type CountryRow = { name: string; code: string }

/** English / Shopify-style aliases → flag-icons ISO 3166-1 alpha-2 `code` (lowercase). */
const EXTRA_ALIASES: Record<string, string> = {
  'united states': 'us',
  usa: 'us',
  uk: 'gb',
  'great britain': 'gb',
  england: 'gb',
  scotland: 'gb',
  wales: 'gb',
}

const NAME_TO_CODE: Map<string, string> = (() => {
  const m = new Map<string, string>()
  for (const row of countryData as CountryRow[]) {
    m.set(row.name.toLowerCase().trim(), row.code.toLowerCase())
  }
  for (const [k, v] of Object.entries(EXTRA_ALIASES)) {
    m.set(k, v)
  }
  return m
})()

/** Tooltip: ISO alpha-2 only (e.g. `US`). */
export function countryCodeOnlyLabel(countryOrCode: string): string {
  const code = countryToFlagCode(countryOrCode)
  return code ? code.toUpperCase() : countryOrCode.trim().toUpperCase().slice(0, 2) || ''
}

/** Normalize Shopify `ships_to_countries` (and similar) to plain strings for flags. */
export function normalizeShipsToCountries(raw: unknown): string[] {
  if (raw == null) return []
  if (typeof raw === 'string') {
    return raw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw) {
    if (typeof item === 'string') {
      const t = item.trim()
      if (t) out.push(t)
    } else if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>
      let c = ''
      if (typeof o.code === 'string') c = o.code
      else if (typeof o.country_code === 'string') c = o.country_code
      else if (typeof o.countryCode === 'string') c = o.countryCode
      else if (typeof o.alpha2 === 'string') c = o.alpha2
      const t = c.trim()
      if (t) out.push(t)
    }
  }
  return out
}

/** Resolve Shopify / free-text country to flag-icons class suffix (e.g. `us`). */
export function countryToFlagCode(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toLowerCase()
  const fromName = NAME_TO_CODE.get(raw.toLowerCase())
  return fromName ?? null
}

type CountryFlagProps = {
  country: string
  /** Square 1×1 (`.fis`). Omit / `false` for default 4×3 rectangular flags. */
  square?: boolean
  className?: string
  title?: string
}

/**
 * SVG flag from [`flag-icons`](https://www.npmjs.com/package/flag-icons) —
 * classes `fi fi-xx` (+ optional `fis` for square).
 */
export function CountryFlag({ country, square = false, className = '', title }: CountryFlagProps) {
  const code = countryToFlagCode(country)
  if (!code) return null
  const cls = ['fi', `fi-${code}`, square ? 'fis' : '', className].filter(Boolean).join(' ')
  return <span className={cls} title={title ?? country} role="img" aria-hidden />
}
