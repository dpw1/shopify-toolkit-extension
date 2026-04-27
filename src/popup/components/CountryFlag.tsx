import countryData from 'flag-icons/country.json'

type CountryRow = { name: string; code: string }

/** English / Shopify-style aliases → flag-icons ISO 3166-1 alpha-2 `code` (lowercase). */
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

/** Resolve Shopify / free-text country to flag-icons class suffix (e.g. `us`). */
export function countryToFlagCode(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  const compact = raw.toLowerCase().replace(/\s+/g, ' ').trim()
  const stripped = compact
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (/^[A-Za-z]{2}$/i.test(raw)) return raw.slice(0, 2).toLowerCase()
  // "US - United States", "US, …", "US" at start of a token.
  const head = raw.match(/^([A-Za-z]{2})(?=$|[\s,;|\/:+\-—])/)
  if (head?.[1]) return head[1].toLowerCase()

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
    if (mapped) return mapped
  }

  const fromName = NAME_TO_CODE.get(compact) ?? NAME_TO_CODE.get(stripped)
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
