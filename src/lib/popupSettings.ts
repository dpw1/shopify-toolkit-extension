/**
 * Unified popup UI persistence — one `popupSettings` object in chrome.storage.local.
 * Legacy keys (`activeTab`, `popupViewState`, `scrollY`) are read once for migration.
 */

import type { PopupPageId, PopupSettings, PopupViewState } from '../types'
import { storageSet } from './storage'

export const POPUP_SETTINGS_VERSION = 1

const LOCAL_FALLBACK_KEY = 'spykit-popup-settings'

const VALID_PAGES: PopupPageId[] = ['stores', 'theme', 'apps', 'scraper', 'downloads', 'export']

/** Persisted tab id was renamed from `overview` → `stores`. */
function normalizeActiveTabId(v: unknown): PopupPageId | undefined {
  if (typeof v !== 'string') return undefined
  const id = v === 'overview' ? 'stores' : v
  return (VALID_PAGES as string[]).includes(id) ? (id as PopupPageId) : undefined
}

export const DEFAULT_POPUP_SETTINGS: PopupSettings = {
  settingsVersion: POPUP_SETTINGS_VERSION,
  theme: 'light',
  activeTab: 'stores',
  scrollY: 0,
  scraperView: 'products',
  scraperPage: 1,
  scraperSearch: '',
  scraperStockFilter: 'all',
  scraperVendorFilters: [],
  scraperTypeFilters: [],
  scraperCatalogFilters: [],
  scraperPerPage: 10,
}

function normalizePartial(raw: unknown): Partial<PopupSettings> {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const out: Partial<PopupSettings> = {}

  if (typeof o.settingsVersion === 'number' && Number.isFinite(o.settingsVersion)) {
    out.settingsVersion = Math.floor(o.settingsVersion)
  }
  if (o.theme === 'light' || o.theme === 'dark') out.theme = o.theme
  const tab = normalizeActiveTabId(o.activeTab)
  if (tab) out.activeTab = tab
  if (typeof o.scrollY === 'number' && o.scrollY >= 0) out.scrollY = Math.floor(o.scrollY)
  if (o.scraperView === 'products' || o.scraperView === 'collections') out.scraperView = o.scraperView
  if (typeof o.scraperPage === 'number' && o.scraperPage >= 1) out.scraperPage = Math.floor(o.scraperPage)
  if (typeof o.scraperSearch === 'string') out.scraperSearch = o.scraperSearch
  if (o.scraperStockFilter === 'all' || o.scraperStockFilter === 'in' || o.scraperStockFilter === 'out') {
    out.scraperStockFilter = o.scraperStockFilter
  }
  if (Array.isArray(o.scraperVendorFilters)) {
    out.scraperVendorFilters = o.scraperVendorFilters.filter((x): x is string => typeof x === 'string')
  }
  if (Array.isArray(o.scraperTypeFilters)) {
    out.scraperTypeFilters = o.scraperTypeFilters.filter((x): x is string => typeof x === 'string')
  }
  if (Array.isArray(o.scraperCatalogFilters)) {
    out.scraperCatalogFilters = o.scraperCatalogFilters.filter((x): x is string => typeof x === 'string')
  }
  if (o.scraperPerPage === 10 || o.scraperPerPage === 25 || o.scraperPerPage === 50) {
    out.scraperPerPage = o.scraperPerPage
  }
  return out
}

function migrateLegacy(result: Record<string, unknown>): Partial<PopupSettings> {
  const out: Partial<PopupSettings> = {}
  if (result.theme === 'light' || result.theme === 'dark') out.theme = result.theme
  const legacyTab = normalizeActiveTabId(result.activeTab)
  if (legacyTab) out.activeTab = legacyTab
  if (typeof result.scrollY === 'number' && result.scrollY >= 0) out.scrollY = Math.floor(result.scrollY)

  const vs = result.popupViewState as PopupViewState | undefined
  if (vs && typeof vs === 'object') {
    const vsTab = normalizeActiveTabId(vs.activePage)
    if (vsTab) out.activeTab = vsTab
    if (vs.scraperView === 'products' || vs.scraperView === 'collections') out.scraperView = vs.scraperView
    if (typeof vs.scraperPage === 'number' && vs.scraperPage >= 1) out.scraperPage = Math.floor(vs.scraperPage)
    if (typeof vs.scraperSearch === 'string') out.scraperSearch = vs.scraperSearch
    if (vs.scraperStockFilter === 'all' || vs.scraperStockFilter === 'in' || vs.scraperStockFilter === 'out') {
      out.scraperStockFilter = vs.scraperStockFilter
    }
    if (Array.isArray(vs.scraperVendorFilters)) out.scraperVendorFilters = vs.scraperVendorFilters as string[]
    if (Array.isArray(vs.scraperTypeFilters)) out.scraperTypeFilters = vs.scraperTypeFilters as string[]
    if (Array.isArray(vs.scraperCatalogFilters)) out.scraperCatalogFilters = vs.scraperCatalogFilters as string[]
    if (vs.scraperPerPage === 10 || vs.scraperPerPage === 25 || vs.scraperPerPage === 50) {
      out.scraperPerPage = vs.scraperPerPage
    }
    if (typeof vs.scrollY === 'number' && vs.scrollY >= 0) out.scrollY = Math.floor(vs.scrollY)
  }
  return out
}

export function mergePopupSettings(
  base: PopupSettings,
  patch: Partial<PopupSettings>,
): PopupSettings {
  return { ...base, ...patch, settingsVersion: POPUP_SETTINGS_VERSION }
}

/** Merge stored + defaults; migrate legacy keys if `popupSettings` missing. */
export function resolvePopupSettings(result: Record<string, unknown>): PopupSettings {
  let merged: PopupSettings = { ...DEFAULT_POPUP_SETTINGS }

  const stored = result.popupSettings
  if (stored != null) {
    merged = mergePopupSettings(merged, normalizePartial(stored))
  } else {
    merged = mergePopupSettings(merged, migrateLegacy(result))
  }

  merged.settingsVersion = POPUP_SETTINGS_VERSION
  return merged
}

export async function loadPopupSettings(): Promise<PopupSettings> {
  try {
    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
      chrome.storage.local.get(
        ['popupSettings', 'theme', 'activeTab', 'popupViewState', 'scrollY'],
        (r) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
          else resolve(r as Record<string, unknown>)
        },
      )
    })
    return resolvePopupSettings(result)
  } catch {
    try {
      const raw = localStorage.getItem(LOCAL_FALLBACK_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        return resolvePopupSettings({ popupSettings: parsed })
      }
    } catch {
      /* ignore */
    }
    return { ...DEFAULT_POPUP_SETTINGS }
  }
}

/** Persist full settings; mirrors `theme` to the top-level key for the service worker. */
export async function persistPopupSettings(settings: PopupSettings): Promise<void> {
  const next = mergePopupSettings(settings, {})
  try {
    await storageSet({ popupSettings: next, theme: next.theme })
  } catch {
    localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(next))
    localStorage.setItem('spakit-theme', next.theme)
  }
}
