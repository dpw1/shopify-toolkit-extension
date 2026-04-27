import { countryCodeOnlyLabel, countryToFlagCode } from './CountryFlag'
import { getShipFlagAssetUrl } from '../lib/shipFlagUrls'

type ShipsToFlagProps = {
  country: string
  className?: string
  title?: string
}

/** Ships-to row: SVG image from bundled `country-flag-icons`. */
export function ShipsToFlag({ country, className = '', title }: ShipsToFlagProps) {
  const code = countryToFlagCode(country)
  if (!code) {
    return (
      <span className={`ships-flag-fallback ${className}`.trim()} title={title ?? country}>
        {country.trim().slice(0, 2).toUpperCase() || '?'}
      </span>
    )
  }
  const t = title ?? countryCodeOnlyLabel(country)
  const src = getShipFlagAssetUrl(code)
  if (src) {
    return (
      <img
        src={src}
        className={`stores-tab-ship-flag-img ${className}`.trim()}
        alt=""
        title={t}
        loading="eager"
        decoding="sync"
      />
    )
  }
  return (
    <span className={`ships-flag-fallback ${className}`.trim()} title={t}>
      {countryCodeOnlyLabel(country) || '?'}
    </span>
  )
}
