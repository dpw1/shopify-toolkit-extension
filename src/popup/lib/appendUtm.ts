const UTM_SOURCE_KEY = 'utm_source'
const UTM_SOURCE_VALUE = 'ezfycode.com'

/** True if the ezfy UTM is already on the href (or similar). */
function hasEzfyUtmSource(href: string): boolean {
  return /[?&]utm_source=ezfycode\.com(?:&|$|#)/i.test(href)
}

/**
 * Appends `?utm_source=ezfycode.com` to http(s) links when missing. Skips
 * `mailto:`, `tel:`, `javascript:`, and `#` placeholders.
 */
export function appendUtmToUrl(href: string): string {
  if (!href || href === '#' || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
    return href
  }
  if (hasEzfyUtmSource(href)) return href
  try {
    const u = new URL(href, 'https://example.com')
    u.searchParams.set(UTM_SOURCE_KEY, UTM_SOURCE_VALUE)
    if (u.origin === 'https://example.com' && (href.startsWith('/') || !href.startsWith('http'))) {
      return `${u.pathname}${u.search}${u.hash}`
    }
    return u.toString()
  } catch {
    return href
  }
}
