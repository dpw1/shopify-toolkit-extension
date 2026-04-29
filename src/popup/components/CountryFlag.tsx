import { countries as supportedCountries } from 'country-flag-icons'
import { getFlagAssetUrl, getFlagCdnUrl } from '../lib/shipFlagUrls'

/** English / Shopify-style aliases → ISO 3166-1 alpha-2 `code` (lowercase). */
const EXTRA_ALIASES: Record<string, string> = {
  'united states': 'us',
  'united states of america': 'us',
  usa: 'us',
  uk: 'gb',
  'great britain': 'gb',
  england: 'gb',
  scotland: 'gb',
  wales: 'gb',
  uae: 'ae',
  'united arab emirates': 'ae',
}

const NAME_TO_CODE: Map<string, string> = (() => {
  const m = new Map<string, string>()
  // Build a country name lookup using built-in Intl region names + supported code set.
  const dn = new Intl.DisplayNames(['en'], { type: 'region' })
  for (const code of supportedCountries as string[]) {
    // Some library codes are non-standard/subdivision-like for Intl region names.
    // `Intl.DisplayNames.of()` can throw RangeError for those; skip safely.
    try {
      const name = dn.of(code)
      if (name) m.set(name.toLowerCase().trim(), code.toLowerCase())
    } catch {
      // no-op
    }
  }
  for (const [k, v] of Object.entries(EXTRA_ALIASES)) {
    m.set(k, v)
  }
  return m
})()
const SUPPORTED_CODE_SET = new Set((supportedCountries as string[]).map((c) => c.toLowerCase()))

/** Tooltip: ISO alpha-2 only (e.g. `US`). */
export function countryCodeOnlyLabel(countryOrCode: string): string {
  const code = countryToFlagCode(countryOrCode)
  return code ? code.toUpperCase() : countryOrCode.trim().toUpperCase().slice(0, 2) || ''
}

/** Pull `ships_to_countries` (and common variants) from `/meta.json` payload. */
export function getShipsToCountriesRaw(shopMeta: unknown): unknown {
  if (shopMeta == null || typeof shopMeta !== 'object') return null
  const o = shopMeta as Record<string, unknown>
  const keys = [
    'ships_to_countries',
    'shipsToCountries',
    'shipping_countries',
    'shippingCountries',
    'ship_to_countries',
    'ships_to',
  ]
  for (const k of keys) {
    if (k in o && o[k] != null) return o[k]
  }
  return null
}

/** Normalize Shopify `ships_to_countries` (and similar) to plain strings for flags. */
export function normalizeShipsToCountries(raw: unknown): string[] {
  const isValidToken = (v: string): boolean => v.trim().length > 1 && countryToFlagCode(v) != null
  const dedupeAndFilter = (arr: string[]): string[] =>
    Array.from(new Set(arr.map((v) => v.trim()).filter((v) => isValidToken(v))))

  if (raw == null) return []
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (t.startsWith('[')) {
      try {
        const parsed = JSON.parse(t) as unknown
        if (Array.isArray(parsed)) return normalizeShipsToCountries(parsed)
      } catch {
        /* fall through */
      }
    }
    return dedupeAndFilter(
      raw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean),
    )
  }
  if (!Array.isArray(raw)) {
    // Some stores expose map-like shapes, e.g. { US: "United States", CA: "Canada" }.
    if (typeof raw === 'object') {
      const outFromObject: string[] = []
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        const key = String(k).trim()
        const keyCode = countryToFlagCode(key)
        if (keyCode) {
          outFromObject.push(key)
          continue
        }
        if (typeof v === 'string') {
          const t = v.trim()
          if (t) outFromObject.push(t)
        } else if (v && typeof v === 'object') {
          const o = v as Record<string, unknown>
          for (const field of ['code', 'country_code', 'countryCode', 'alpha2', 'iso2', 'isoCode', 'name', 'label']) {
            const fv = o[field]
            if (typeof fv === 'string' && fv.trim()) {
              outFromObject.push(fv.trim())
              break
            }
          }
        }
      }
      return dedupeAndFilter(outFromObject)
    }
    return []
  }
  const out: string[] = []
  for (const item of raw) {
    if (typeof item === 'string') {
      const t = item.trim()
      if (t) out.push(t)
    } else if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>
      // Accept multiple payload shapes: ISO code or country name labels.
      const candidates: string[] = []
      const pick = (v: unknown) => {
        if (typeof v === 'string') {
          const t = v.trim()
          if (t) candidates.push(t)
        }
      }

      pick(o.code)
      pick(o.country_code)
      pick(o.countryCode)
      pick(o.alpha2)
      pick(o.iso2)
      pick(o.isoCode)
      pick(o.country)
      pick(o.country_name)
      pick(o.countryName)
      pick(o.country_iso2)
      pick(o.countryIso2)
      pick(o.iso_2)
      pick(o.cca2)
      pick(o.name)
      pick(o.label)
      pick(o.title)
      const nestedCountry = o.country as Record<string, unknown> | undefined
      if (nestedCountry && typeof nestedCountry === 'object') {
        pick(nestedCountry.code)
        pick(nestedCountry.alpha2)
        pick(nestedCountry.iso2)
        pick(nestedCountry.isoCode)
        pick(nestedCountry.cca2)
        pick(nestedCountry.name)
      }

      const firstValid = candidates.find((v) => countryToFlagCode(v) != null)
      if (firstValid) out.push(firstValid)
      else if (candidates[0]) out.push(candidates[0])
    }
  }
  return dedupeAndFilter(out)
}

/** Resolve Shopify / free-text country to ISO alpha-2 code (e.g. `us`). */
export function countryToFlagCode(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  const compact = raw.toLowerCase().replace(/\s+/g, ' ').trim()
  const stripped = compact
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (/^[A-Za-z]{2}$/i.test(raw)) {
    const code = raw.slice(0, 2).toLowerCase()
    return SUPPORTED_CODE_SET.has(code) ? code : null
  }
  // "US - United States", "US, …", "US" at start of a token.
  const head = raw.match(/^([A-Za-z]{2})(?=$|[\s,;|\/:+\-—])/)
  if (head?.[1]) {
    const code = head[1].toLowerCase()
    return SUPPORTED_CODE_SET.has(code) ? code : null
  }

  // Common alpha-3 forms.
  if (/^[A-Za-z]{3}$/.test(raw)) {
    const alpha3: Record<string, string> = {
      usa: 'us',
      gbr: 'gb',
      deu: 'de',
      fra: 'fr',
      ita: 'it',
      esp: 'es',
      can: 'ca',
      aus: 'au',
      nld: 'nl',
      bel: 'be',
      swe: 'se',
      che: 'ch',
      aut: 'at',
      nor: 'no',
      dnk: 'dk',
      fin: 'fi',
      irl: 'ie',
      nzl: 'nz',
      jpn: 'jp',
      kor: 'kr',
      chn: 'cn',
      ind: 'in',
      are: 'ae',
      bra: 'br',
      mex: 'mx',
      arg: 'ar',
      zaf: 'za',
    }
    const mapped = alpha3[raw.toLowerCase()]
    if (mapped && SUPPORTED_CODE_SET.has(mapped)) return mapped
  }

  const fromName = NAME_TO_CODE.get(compact) ?? NAME_TO_CODE.get(stripped) ?? null
  return fromName && SUPPORTED_CODE_SET.has(fromName) ? fromName : null
}

type CountryFlagProps = {
  country: string
  /** Square 1×1 (`.fis`). Omit / `false` for default 4×3 rectangular flags. */
  square?: boolean
  className?: string
  title?: string
}

/** SVG flag from bundled `country-flag-icons` assets. */
export function CountryFlag({ country, square = false, className = '', title }: CountryFlagProps) {
  const code = countryToFlagCode(country)
  if (!code) return null
  const src = getFlagAssetUrl(code, square) ?? getFlagCdnUrl(code)
  if (!src) return null
  return (
    <img
      src={src}
      onError={(e) => {
        const next = getFlagCdnUrl(code)
        if (e.currentTarget.src !== next) e.currentTarget.src = next
      }}
      className={className}
      title={title ?? country}
      alt=""
      loading="eager"
      decoding="sync"
    />
  )
}
