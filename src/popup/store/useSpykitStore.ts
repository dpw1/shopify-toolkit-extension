import { create } from 'zustand'
import type { CatalogCollectionRow, CatalogProductRow, StoreInfo } from '../../types'
import type { StorefrontEligibility } from '../hooks/useStoreInfo'

export type FetchStep =
  | 'idle'
  | 'fetching-theme'
  | 'fetching-store'
  | 'fetching-collections'
  | 'fetching-products'
  | 'fetching-apps'
  | 'done'

interface SpykitState {
  // ── Core store data (persisted in chrome.storage / IndexedDB by background) ──
  storeInfo: StoreInfo | null
  products: CatalogProductRow[]
  collections: CatalogCollectionRow[]

  // ── Fetch metadata ──────────────────────────────────────────────────────────
  /** Unix ms of the last completed fetchAllData run. */
  lastFetchedAt: number | null
  /** Current step of the fetchAllData orchestration. */
  fetchStep: FetchStep

  // ── UI flags ────────────────────────────────────────────────────────────────
  storeInfoLoaded: boolean
  storefrontEligibility: StorefrontEligibility

  /** Theme name matches in SpyKit stores library (Supabase cache) vs total rows scanned. */
  themePeerMatchCount: number | null
  themePeerTotalLibrary: number | null
  themePeersLoading: boolean

  // ── Actions ─────────────────────────────────────────────────────────────────
  setStoreInfo: (info: StoreInfo | null) => void
  setProducts: (products: CatalogProductRow[]) => void
  setCollections: (collections: CatalogCollectionRow[]) => void
  setLastFetchedAt: (at: number) => void
  setFetchStep: (step: FetchStep) => void
  setStoreInfoLoaded: (loaded: boolean) => void
  setStorefrontEligibility: (e: StorefrontEligibility) => void
  setThemePeerLibrary: (patch: {
    themePeerMatchCount?: number | null
    themePeerTotalLibrary?: number | null
    themePeersLoading?: boolean
  }) => void
}

export const useSpykitStore = create<SpykitState>()((set) => ({
  storeInfo: null,
  products: [],
  collections: [],
  lastFetchedAt: null,
  fetchStep: 'idle',
  storeInfoLoaded: false,
  storefrontEligibility: 'checking',
  themePeerMatchCount: null,
  themePeerTotalLibrary: null,
  themePeersLoading: false,

  setStoreInfo: (info) => set({ storeInfo: info }),
  setProducts: (products) => set({ products }),
  setCollections: (collections) => set({ collections }),
  setLastFetchedAt: (at) => set({ lastFetchedAt: at }),
  setFetchStep: (step) => set({ fetchStep: step }),
  setStoreInfoLoaded: (loaded) => set({ storeInfoLoaded: loaded }),
  setStorefrontEligibility: (e) => set({ storefrontEligibility: e }),
  setThemePeerLibrary: (patch) =>
    set((s) => ({
      themePeerMatchCount:
        patch.themePeerMatchCount !== undefined ? patch.themePeerMatchCount : s.themePeerMatchCount,
      themePeerTotalLibrary:
        patch.themePeerTotalLibrary !== undefined ? patch.themePeerTotalLibrary : s.themePeerTotalLibrary,
      themePeersLoading:
        patch.themePeersLoading !== undefined ? patch.themePeersLoading : s.themePeersLoading,
    })),
}))
