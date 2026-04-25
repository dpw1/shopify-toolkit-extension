import { useId, useMemo } from 'react'
import PAYMENT_RAW from '../generated/paymentSvgRaw.json'

const PAYMENT = PAYMENT_RAW as Record<string, string>

const ALIASES: Record<string, string> = {
  amex: 'american_express',
  mastercard: 'master',
}

function normalizeBrand(brand: string): string | null {
  const b = brand.trim().toLowerCase().replace(/\s+/g, '_')
  const mapped = ALIASES[b] ?? b
  return mapped in PAYMENT ? mapped : null
}

/** Shopify `shopify_pay_enabled_card_brands` value → SVG from `samples/payment-icons.html`. */
export function PaymentBrandIcon({ brand }: { brand: string }) {
  const uid = useId().replace(/:/g, '')
  const key = normalizeBrand(brand)

  const html = useMemo(() => {
    if (!key) return null
    const raw = PAYMENT[key]
    if (!raw) return null
    return raw
      .replace(/\bid="pi-/g, `id="${uid}-pi-`)
      .replace(/aria-labelledby="pi-/g, `aria-labelledby="${uid}-pi-`)
      .replace(/url\(#pi-/g, `url(#${uid}-pi-`)
  }, [key, uid])

  if (!html) {
    return (
      <span className="payment-brand-fallback" title={brand}>
        {brand.replace(/_/g, ' ')}
      </span>
    )
  }

  return <span className="payment-brand-html" dangerouslySetInnerHTML={{ __html: html }} />
}
