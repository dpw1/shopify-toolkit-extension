/**
 * Injected into the storefront tab via `chrome.scripting.executeScript`.
 * Must be self-contained (no imports) — Chrome serializes it into the page.
 *
 * Order: `window.Shopify.shop` → brief wait (theme boot) → `/meta.json`
 * `myshopify_domain` → URL hostname.  This matches how the content script
 * keys `SHOP_META` so the popup always resolves the same cache slot.
 */
export async function resolveShopDomainInPage(): Promise<string> {
  const norm = (s: string) => s.trim().toLowerCase().replace(/^www\./, '')

  const readShopifyShop = (): string => {
    const w = window as unknown as { Shopify?: { shop?: string } }
    const s = w.Shopify?.shop
    return typeof s === 'string' && s.trim() ? norm(s) : ''
  }

  let shop = readShopifyShop()
  if (!shop) {
    await new Promise<void>((r) => setTimeout(r, 320))
    shop = readShopifyShop()
  }
  if (shop) return shop

  try {
    const r = await fetch('/meta.json', { credentials: 'same-origin' })
    if (r.ok) {
      const j = (await r.json()) as { myshopify_domain?: string }
      const m = j.myshopify_domain
      if (typeof m === 'string' && m.trim()) return norm(m)
    }
  } catch {
    /* offline / blocked */
  }

  return norm(window.location.hostname)
}
