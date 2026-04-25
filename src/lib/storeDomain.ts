/** Canonical key for `storeCacheByDomain` + IndexedDB `by_domain` index. */
export function normalizeStoreDomainKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/^www\./, '')
}
