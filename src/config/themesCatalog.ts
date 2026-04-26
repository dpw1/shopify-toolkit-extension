import defaults from './appsCatalog.defaults.json'

type Defaults = {
  appsCatalogJsonFallbackUrl: string
  themesCatalogJsonUrl?: string
}

const d = defaults as Defaults

/** Bundled default — same as `themesCatalogJsonUrl` in appsCatalog.defaults.json */
const THEMES_JSON_FALLBACK =
  'https://pandatests.myshopify.com/cdn/shop/t/40/assets/themes.json'

/**
 * Remote `themes.json` used to enrich the Theme tab (Theme Store URL, pricing, images, reviews).
 * Override at build time with `VITE_THEMES_CATALOG_JSON_URL` in `.env` / `.env.local`,
 * or update `themesCatalogJsonUrl` in `appsCatalog.defaults.json`.
 */
export const THEMES_CATALOG_JSON_URL: string =
  (import.meta.env.VITE_THEMES_CATALOG_JSON_URL as string | undefined)?.trim() ||
  (typeof d.themesCatalogJsonUrl === 'string' ? d.themesCatalogJsonUrl.trim() : '') ||
  THEMES_JSON_FALLBACK
