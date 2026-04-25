import type { ShopifyTheme, StoreInfo } from '../../types'

/**
 * Theme row on Store tab and Theme tab: prefer normalized `StoreInfo.theme`, but if
 * the cache is empty while `shopifyThemeRaw` exists (PAGE_DATA path), show schema name / version.
 */
export function getResolvedThemeForUI(storeInfo: StoreInfo | null): ShopifyTheme | null {
  if (!storeInfo) return null
  const t = storeInfo.theme
  const hasGoodName = Boolean(t?.name && t.name !== '—' && t.name.toLowerCase() !== 'unknown')
  if (hasGoodName) return t

  const raw = storeInfo.shopifyThemeRaw
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>
    const schemaName = r['schema_name'] != null ? String(r['schema_name']).trim() : ''
    const folderName = r['name'] != null && String(r['name']) !== 'null' ? String(r['name']).trim() : ''
    const name = schemaName || folderName || t?.name || '—'
    const version =
      r['schema_version'] != null
        ? String(r['schema_version'])
        : t?.version != null
          ? String(t.version)
          : ''
    const isOS2 =
      Boolean(r['schema_name']) ||
      Boolean((r as { sections?: unknown }).sections) ||
      Boolean(t?.isOS2)
    return {
      ...(t ?? {}),
      name,
      version,
      author: t?.author ?? 'Shopify',
      isOS2: isOS2 || false,
      themeRenamed: folderName && folderName !== schemaName ? folderName : t?.themeRenamed,
      themeId: typeof r['id'] === 'number' ? r['id'] : t?.themeId,
      schemaName: schemaName || t?.schemaName,
      schemaVersion: r['schema_version'] != null ? String(r['schema_version']) : t?.schemaVersion,
    } as ShopifyTheme
  }
  return t ?? null
}
