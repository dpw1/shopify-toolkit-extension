import defaults from './appsCatalog.defaults.json'

const FALLBACK = defaults.appsCatalogJsonFallbackUrl

/**
 * Canonical bundled app catalog (`apps.json`) URL used when the store CDN
 * path cannot be inferred. Override at build time with `VITE_APPS_CATALOG_JSON_URL`
 * in `.env` / `.env.local`.
 */
export const APPS_CATALOG_JSON_URL: string =
  (import.meta.env.VITE_APPS_CATALOG_JSON_URL as string | undefined)?.trim() || FALLBACK
