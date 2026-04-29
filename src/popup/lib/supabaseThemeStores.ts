const SUPABASE_URL = 'https://sfatrzmeapcuszpxnrvc.supabase.co'
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''
// Keep this intentionally small: we only need theme fields for popup matching.
const SELECT_FIELDS = 'id,theme_name,theme_version'

const CACHE_KEY = 'spykitSupabaseStoresCacheV1'
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

type SupabaseStoreRow = {
  id?: number
  theme_name?: string | null
  theme_version?: string | null
  [k: string]: unknown
}

type SupabaseStoresCache = {
  fetchedAt: number
  extensionVersion: string
  themeVersion: string
  rows: SupabaseStoreRow[]
}

function normalizeThemeName(themeName: string): string {
  return themeName.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function storageGetRaw<T>(key: string): Promise<T | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        resolve(null)
        return
      }
      resolve((result[key] as T | undefined) ?? null)
    })
  })
}

async function storageSetRaw<T>(key: string, value: T): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else resolve()
    })
  })
}

async function storageRemoveRaw(key: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    chrome.storage.local.remove([key], () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else resolve()
    })
  })
}

async function fetchStoresPage(limit = 1000, offset = 0): Promise<SupabaseStoreRow[]> {
  const url =
    `${SUPABASE_URL}/rest/v1/stores` +
    `?select=${encodeURIComponent(SELECT_FIELDS)}` +
    '&order=id.asc' +
    `&limit=${limit}&offset=${offset}`
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.warn('[SpyKit Popup] Supabase request failed', {
      status: res.status,
      body,
    })
    throw new Error(`Stores request failed: ${res.status}`)
  }
  const data = (await res.json()) as unknown
  return Array.isArray(data) ? (data as SupabaseStoreRow[]) : []
}

async function fetchAllStores(): Promise<SupabaseStoreRow[]> {
  const pageSize = 1000
  let offset = 0
  const rows: SupabaseStoreRow[] = []
  while (true) {
    const page = await fetchStoresPage(pageSize, offset)
    rows.push(...page)
    if (page.length < pageSize) break
    offset += pageSize
  }
  return rows
}

export async function refetchSupabaseStoresLibrary(
  themeVersion: string | null | undefined,
): Promise<{ ok: true; totalFetched: number } | { ok: false; error: string }> {
  if (!SUPABASE_ANON_KEY) {
    return { ok: false, error: 'Missing stores library API key' }
  }
  const extensionVersion = chrome.runtime.getManifest().version ?? '0.0.0'
  const rows = await fetchAllStores()
  await storageRemoveRaw(CACHE_KEY)
  await storageSetRaw<SupabaseStoresCache>(CACHE_KEY, {
    fetchedAt: Date.now(),
    extensionVersion,
    themeVersion: (themeVersion ?? '').trim(),
    rows,
  })
  console.log('[SpyKit Popup] Supabase stores library manually re-fetched', {
    totalRows: rows.length,
  })
  return { ok: true, totalFetched: rows.length }
}

export type ThemeMatchesResult =
  | { ok: true; matches: SupabaseStoreRow[]; totalFetched: number; fromCache: boolean }
  | { ok: false; reason: 'missing_key' | 'network_error'; error?: string }

export async function getSupabaseThemeMatches(
  themeName: string | null | undefined,
  themeVersion: string | null | undefined,
): Promise<ThemeMatchesResult> {
  const name = typeof themeName === 'string' ? themeName.trim() : ''
  if (!name) return { ok: true, matches: [], totalFetched: 0, fromCache: true }
  if (!SUPABASE_ANON_KEY) return { ok: false, reason: 'missing_key' }

  const extensionVersion = chrome.runtime.getManifest().version ?? '0.0.0'
  const currentThemeVersion = (themeVersion ?? '').trim()
  const now = Date.now()
  const cached = await storageGetRaw<SupabaseStoresCache>(CACHE_KEY)

  const canUseCache =
    cached != null &&
    Array.isArray(cached.rows) &&
    now - cached.fetchedAt < WEEK_MS &&
    cached.extensionVersion === extensionVersion &&
    cached.themeVersion === currentThemeVersion

  try {
    const rows = canUseCache ? cached.rows : await fetchAllStores()
    console.log('[SpyKit Popup] Supabase stores payload', {
      fromCache: canUseCache,
      totalRows: rows.length,
      rows,
    })
    if (!canUseCache) {
      await storageSetRaw<SupabaseStoresCache>(CACHE_KEY, {
        fetchedAt: now,
        extensionVersion,
        themeVersion: currentThemeVersion,
        rows,
      })
    }
    const needle = normalizeThemeName(name)
    const matches = rows.filter((row) => normalizeThemeName(String(row.theme_name ?? '')) === needle)
    return { ok: true, matches, totalFetched: rows.length, fromCache: canUseCache }
  } catch (e) {
    return {
      ok: false,
      reason: 'network_error',
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
