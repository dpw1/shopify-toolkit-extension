import { countryCodeOnlyLabel, countryToFlagCode } from './CountryFlag'
import { getShipFlagAssetUrl } from '../lib/shipFlagUrls'

type ShipsToFlagProps = {
  country: string
  className?: string
  title?: string
}

/**
 * Ships-to row: render with a bundled SVG `<img>` when possible, else CSS `flag-icons` span.
 */
export function ShipsToFlag({ country, className = '', title }: ShipsToFlagProps) {
  const code = countryToFlagCode(country)
  if (!code) {
    return (
      <span className={`ships-flag-fallback ${className}`.trim()} title={title ?? country}>
        {country.trim().slice(0, 2).toUpperCase() || '?'}
      </span>
    )
  }
  const src = getShipFlagAssetUrl(code)
  const t = title ?? countryCodeOnlyLabel(country)
  if (src) {
    return (
      <img
        src={src}
        className={`stores-tab-ship-flag-img ${className}`.trim()}
        alt=""
        title={t}
        loading="lazy"
        decoding="async"
      />
    )
  }
  return (
    <span
      className={['fi', `fi-${code}`, 'stores-tab-flag', 'stores-tab-flag--ships', className].filter(Boolean).join(' ')}
      title={t}
      role="img"
      aria-hidden
    />
  )
}
