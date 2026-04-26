import { useEffect, useMemo, useRef, useState } from 'react'
import type { CatalogCollectionRow, CatalogProductRow, StoreInfo } from '../../types'
import { Search, Package, Folder, Link2, X } from 'lucide-react'
import {
  buildPageList,
  PaginatedTable,
  type PerPage,
} from '../components/PaginatedTable'
import { appendUtmToUrl } from '../lib/appendUtm'
import { emitSpykitToast } from '../lib/spykitToastBus'
import './productsTab.css'

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductRow = {
  id: number
  name: string
  path: string
  vendor: string
  productType: string
  price: string
  comparePrice: string
  status: 'In Stock' | 'Out of Stock'
  imageUrl?: string
  collections: string[]
}

type CollectionRow = {
  id: number
  name: string
  path: string
  productCount: number
  handle: string
}

type StockFilter = 'all' | 'in' | 'out'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rowToProduct(p: CatalogProductRow): ProductRow {
  const title = String(p.title ?? 'Untitled')
  const handle = String(p.handle ?? '')
  const path = handle ? `/products/${handle}` : '—'
  const vendor = p.vendor != null && String(p.vendor) !== '' ? String(p.vendor) : '—'
  const typeRaw = (p as { product_type?: string }).product_type
  const t2 = (p as { type?: string }).type
  const productType =
    typeRaw != null && String(typeRaw) !== ''
      ? String(typeRaw)
      : t2 != null && String(t2) !== ''
      ? String(t2)
      : '—'

  const variants = p.variants as Array<{ price?: string; available?: boolean }> | undefined
  let price = '—'
  let comparePrice = '—'
  if (variants?.length) {
    const prices = variants.map((v) => v.price).filter((x): x is string => x != null && x !== '')
    if (prices.length) {
      const nums = prices.map((x) => parseFloat(x))
      const min = Math.min(...nums)
      const max = Math.max(...nums)
      const fmt = (n: number) =>
        n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      price = min === max ? `$${fmt(min)}` : `from $${fmt(min)}`
    }
    const compareAtPrices = variants
      .map((v) => (v as { compare_at_price?: string }).compare_at_price)
      .filter((x): x is string => x != null && x !== '')
    if (compareAtPrices.length) {
      const nums = compareAtPrices.map((x) => parseFloat(x))
      const valid = nums.filter((n) => Number.isFinite(n) && n > 0)
      if (valid.length) {
        const min = Math.min(...valid)
        const max = Math.max(...valid)
        const fmt = (n: number) =>
          n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        comparePrice = min === max ? `$${fmt(min)}` : `from $${fmt(min)}`
      }
    }
  }

  const status: ProductRow['status'] = variants?.length
    ? variants.some((v) => v.available === true)
      ? 'In Stock'
      : 'Out of Stock'
    : 'In Stock'

  let imageUrl: string | undefined
  const images = p.images
  if (Array.isArray(images) && images[0]) {
    const im = images[0] as { src?: string } | string
    imageUrl = typeof im === 'string' ? im : im?.src
  }
  if (!imageUrl) {
    const im = p.image as { src?: string } | undefined
    if (im?.src) imageUrl = im.src
  }
  imageUrl = toSmallImageUrl(imageUrl)

  const rawP = p as Record<string, unknown>
  const collections = Array.isArray(rawP._collections)
    ? (rawP._collections as string[])
    : []

  return { id: p.id, name: title, path, vendor, productType, price, comparePrice, status, imageUrl, collections }
}

function collectionFromRow(c: CatalogCollectionRow, idx: number): CollectionRow {
  const title = c.title != null && String(c.title) !== '' ? String(c.title) : `Collection ${idx + 1}`
  const handle = String(c.handle ?? '')
  const path = handle ? `/collections/${handle}` : '—'
  const pc = (c as { products_count?: number }).products_count
  const productCount = typeof pc === 'number' ? pc : 0
  return { id: c.id, name: title, path, productCount, handle }
}

function toSmallImageUrl(url?: string): string | undefined {
  if (!url) return url
  const m = url.match(/\.(jpe?g|png|gif|webp)(\?[^#]*)?(#.*)?$/i)
  if (!m) return url
  const ext = m[1]
  const query = m[2] ?? ''
  const hash = m[3] ?? ''
  const withoutSuffix = url.slice(0, m.index)
  return `${withoutSuffix}_100x.${ext}${query}${hash}`
}


function exportRowsJson(filename: string, rows: ProductRow[]) {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

const IMG_PLACEHOLDER = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)

// ─── Filter modal ─────────────────────────────────────────────────────────────

function FilterModal({
  stockFilter,
  setStockFilter,
  vendorFilters,
  toggleVendorFilter,
  typeFilters,
  toggleTypeFilter,
  catalogFilters,
  toggleCatalogFilter,
  vendors,
  types,
  collections,
  collectionsLinking,
  onClose,
  onReset,
}: {
  stockFilter: StockFilter
  setStockFilter: (v: StockFilter) => void
  vendorFilters: string[]
  toggleVendorFilter: (v: string) => void
  typeFilters: string[]
  toggleTypeFilter: (v: string) => void
  catalogFilters: string[]
  toggleCatalogFilter: (v: string) => void
  vendors: string[]
  types: string[]
  collections: CollectionRow[]
  /** While BG fetches per-collection `products.json` to fill filter membership — list waits, main table does not. */
  collectionsLinking: boolean
  onClose: () => void
  onReset: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // close on overlay-backdrop click
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose()
  }

  // close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const activeCount = [
    stockFilter !== 'all',
    vendorFilters.length > 0,
    typeFilters.length > 0,
    catalogFilters.length > 0,
  ].filter(Boolean).length

  return (
    <div className="filter-modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="filter-modal" role="dialog" aria-modal="true" aria-label="Filter products">
        <div className="filter-modal-header">
          <span className="filter-modal-title">
            Filters{activeCount > 0 && <span className="filter-badge">{activeCount}</span>}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {activeCount > 0 && (
              <button type="button" className="filter-reset-btn" onClick={onReset}>
                Reset all
              </button>
            )}
            <button type="button" className="close-icon" aria-label="Close filters" onClick={onClose}>
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="filter-modal-body">
          {/* Stock */}
          <div className="filter-section">
            <div className="filter-section-label">Stock</div>
            <div className="filter-pill-group">
              {(['all', 'in', 'out'] as StockFilter[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`filter-btn${stockFilter === v ? ' active' : ''}`}
                  onClick={() => setStockFilter(v)}
                >
                  {v === 'all' ? 'All' : v === 'in' ? 'In Stock' : 'Out of Stock'}
                </button>
              ))}
            </div>
          </div>

          {/* Collections */}
          <div className="filter-section">
            <div className="filter-section-label">Collections</div>
            <details className="filter-multi">
              <summary className="filter-multi-summary">
                {collectionsLinking
                  ? 'Linking collections…'
                  : catalogFilters.length
                    ? `${catalogFilters.length} selected`
                    : 'All collections'}
              </summary>
              <div className="filter-multi-list">
                {collectionsLinking ? (
                  <div className="filter-collections-linking" role="status">
                    <span className="filter-collections-linking-skel" aria-hidden />
                    <p className="filter-collections-linking-text">
                      Matching products to collections — product list is already available.
                    </p>
                  </div>
                ) : (
                  collections.map((c) => {
                    const checked = catalogFilters.includes(c.handle)
                    const disabled = c.productCount <= 0
                    return (
                      <label key={c.id} className={`filter-check-row${disabled ? ' is-disabled' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleCatalogFilter(c.handle)}
                        />
                        <span>{c.name} ({c.productCount})</span>
                      </label>
                    )
                  })
                )}
              </div>
            </details>
          </div>

          {/* Vendor */}
          <div className="filter-section">
            <div className="filter-section-label">Vendor</div>
            <details className="filter-multi">
              <summary className="filter-multi-summary">
                {vendorFilters.length ? `${vendorFilters.length} selected` : 'All vendors'}
              </summary>
              <div className="filter-multi-list">
                {vendors.map((v) => (
                  <label key={v} className="filter-check-row">
                    <input
                      type="checkbox"
                      checked={vendorFilters.includes(v)}
                      onChange={() => toggleVendorFilter(v)}
                    />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
            </details>
          </div>

          {/* Type */}
          <div className="filter-section">
            <div className="filter-section-label">Product Type</div>
            <details className="filter-multi">
              <summary className="filter-multi-summary">
                {typeFilters.length ? `${typeFilters.length} selected` : 'All types'}
              </summary>
              <div className="filter-multi-list">
                {types.map((t) => (
                  <label key={t} className="filter-check-row">
                    <input
                      type="checkbox"
                      checked={typeFilters.includes(t)}
                      onChange={() => toggleTypeFilter(t)}
                    />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
            </details>
          </div>
        </div>

        <div className="filter-modal-footer">
          <button type="button" className="pt-btn pt-btn-primary" style={{ width: '100%' }} onClick={onClose}>
            Apply filters
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  storeInfo: StoreInfo | null
  /** Catalog rows from IndexedDB — set as first-class state in useStoreInfo. */
  products: CatalogProductRow[]
  collections: CatalogCollectionRow[]
  initialView?: 'products' | 'collections'
  initialPage?: number
  initialSearch?: string
  initialStockFilter?: StockFilter
  initialVendorFilters?: string[]
  initialTypeFilters?: string[]
  initialCatalogFilters?: string[]
  initialPerPage?: PerPage
  onPersistViewState?: (payload: {
    view: 'products' | 'collections'
    page: number
    search: string
    stockFilter: StockFilter
    vendorFilters: string[]
    typeFilters: string[]
    catalogFilters: string[]
    perPage: PerPage
  }) => void
}

export default function ScraperPage({
  storeInfo,
  products: storeProducts,
  collections: storeCollections,
  initialView = 'products',
  initialPage = 1,
  initialSearch = '',
  initialStockFilter = 'all',
  initialVendorFilters = [],
  initialTypeFilters = [],
  initialCatalogFilters = [],
  initialPerPage = 10,
  onPersistViewState,
}: Props) {

  const [search, setSearch] = useState(initialSearch)
  const [stockFilter, setStockFilter] = useState<StockFilter>(initialStockFilter)
  const [vendorFilters, setVendorFilters] = useState<string[]>(initialVendorFilters)
  const [typeFilters, setTypeFilters] = useState<string[]>(initialTypeFilters)
  const [catalogFilters, setCatalogFilters] = useState<string[]>(initialCatalogFilters)
  const [showFilters, setShowFilters] = useState(false)
  const [mainView, setMainView] = useState<'products' | 'collections'>(initialView)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<PerPage>(initialPerPage)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // Parent may switch sub-view (e.g. Overview → Collections stat opens Products tab on collections).
  useEffect(() => {
    setMainView(initialView)
  }, [initialView])

  // Derived rows
  const productRows: ProductRow[] = useMemo(
    () => storeProducts.map((p) => rowToProduct(p)),
    [storeProducts],
  )
  const collectionRows: CollectionRow[] = useMemo(
    () => storeCollections.map((c, i) => collectionFromRow(c, i)),
    [storeCollections],
  )

  // Filter options
  const vendors = useMemo(() => {
    const s = new Set<string>()
    for (const r of productRows) if (r.vendor !== '—') s.add(r.vendor)
    return [...s].sort()
  }, [productRows])
  const types = useMemo(() => {
    const s = new Set<string>()
    for (const r of productRows) if (r.productType !== '—') s.add(r.productType)
    return [...s].sort()
  }, [productRows])
  const collectionNameByHandle = useMemo(
    () => new Map(collectionRows.map((c) => [c.handle, c.name])),
    [collectionRows],
  )

  const filteredProducts = useMemo(() => {
    let rows = productRows
    const q = search.trim().toLowerCase()
    if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.vendor.toLowerCase().includes(q))
    if (stockFilter === 'in') rows = rows.filter((r) => r.status === 'In Stock')
    if (stockFilter === 'out') rows = rows.filter((r) => r.status === 'Out of Stock')
    if (vendorFilters.length > 0) rows = rows.filter((r) => vendorFilters.includes(r.vendor))
    if (typeFilters.length > 0) rows = rows.filter((r) => typeFilters.includes(r.productType))
    if (catalogFilters.length > 0) {
      rows = rows.filter((r) => r.collections.some((h) => catalogFilters.includes(h)))
    }
    return rows
  }, [productRows, search, stockFilter, vendorFilters, typeFilters, catalogFilters])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * perPage
    return filteredProducts.slice(start, start + perPage)
  }, [filteredProducts, currentPage, perPage])
  const pageList = useMemo(() => buildPageList(currentPage, totalPages), [currentPage, totalPages])
  const collectionsTotalPages = Math.max(1, Math.ceil(collectionRows.length / perPage))
  const collectionsCurrentPage = Math.min(page, collectionsTotalPages)
  const collectionPageItems = useMemo(() => {
    const start = (collectionsCurrentPage - 1) * perPage
    return collectionRows.slice(start, start + perPage)
  }, [collectionRows, collectionsCurrentPage, perPage])
  const collectionsPageList = useMemo(
    () => buildPageList(collectionsCurrentPage, collectionsTotalPages),
    [collectionsCurrentPage, collectionsTotalPages],
  )
  function goToPage(targetPage: number) {
    const maxPages = mainView === 'products' ? totalPages : collectionsTotalPages
    const next = Math.min(Math.max(1, targetPage), Math.max(1, maxPages))
    setPage(next)
  }
  useEffect(() => {
    const w = window as Window & {
      goToPage?: (targetPage: number) => void
      spykitGoToPage?: (targetPage: number) => void
    }
    w.goToPage = goToPage
    w.spykitGoToPage = goToPage
    return () => {
      if (w.goToPage === goToPage) delete w.goToPage
      if (w.spykitGoToPage === goToPage) delete w.spykitGoToPage
    }
  }, [goToPage])

  // Always points to the freshest goToPage closure so delayed callbacks use current state.
  const goToPageRef = useRef(goToPage)
  useEffect(() => { goToPageRef.current = goToPage })

  const didMountRef = useRef(false)
  const restoreDoneRef = useRef(false)
  const desiredInitialPageRef = useRef(Math.max(1, initialPage))
  // Holds the restore timer so we can cancel it only on unmount (not on dep changes).
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Keep restored page on first render; only reset on later filter/view changes.
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    setPage(1)
  }, [search, stockFilter, vendorFilters, typeFilters, catalogFilters, perPage, mainView])

  useEffect(() => {
    // Wait for data to settle, then jump to the saved page.
    // BUG FIX: do NOT return a cleanup fn here — catalogLoading flipping true→false would
    // cancel the timer via cleanup before the new effect run returns early on restoreDoneRef.
    if (restoreDoneRef.current) return
    const catalogReady = storeProducts.length > 0 || storeInfo?.catalogLoading === false
    if (!catalogReady) return
    restoreDoneRef.current = true
    restoreTimerRef.current = setTimeout(() => {
      const target = desiredInitialPageRef.current
      goToPageRef.current(target)
    }, 250)
    // No cleanup here on purpose — see comment above.
  }, [storeProducts.length, storeInfo?.catalogLoading, totalPages])

  // Cancel restore timer only when the component actually unmounts.
  useEffect(() => () => {
    if (restoreTimerRef.current != null) clearTimeout(restoreTimerRef.current)
  }, [])

  const persistCbRef = useRef(onPersistViewState)
  useEffect(() => {
    persistCbRef.current = onPersistViewState
  }, [onPersistViewState])

  useEffect(() => {
    if (!restoreDoneRef.current) return
    persistCbRef.current?.({
      view: mainView,
      page: mainView === 'products' ? currentPage : collectionsCurrentPage,
      search,
      stockFilter,
      vendorFilters,
      typeFilters,
      catalogFilters,
      perPage,
    })
  }, [
    mainView,
    currentPage,
    collectionsCurrentPage,
    search,
    stockFilter,
    vendorFilters,
    typeFilters,
    catalogFilters,
    perPage,
  ])

  // Select-all for current page
  const allPageSelected = pageItems.length > 0 && pageItems.every((r) => selected.has(r.id))
  const somePageSelected = pageItems.some((r) => selected.has(r.id)) && !allPageSelected
  const selectAllRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = somePageSelected
  }, [somePageSelected])

  function toggleSelectAll() {
    setSelected((prev) => {
      const n = new Set(prev)
      if (allPageSelected) pageItems.forEach((r) => n.delete(r.id))
      else pageItems.forEach((r) => n.add(r.id))
      return n
    })
  }

  const domain = storeInfo?.domain?.replace(/^https?:\/\//, '') ?? ''
  const baseUrl = domain ? `https://${domain}` : ''

  function openPath(path: string) {
    if (!baseUrl || !path || path === '—') return
    const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
    window.open(appendUtmToUrl(url), '_blank')
  }

  function resetFilters() {
    setStockFilter('all')
    setVendorFilters([])
    setTypeFilters([])
    setCatalogFilters([])
  }

  function toggleValue(current: string[], val: string, setter: (vals: string[]) => void) {
    if (!val) return
    setter(current.includes(val) ? current.filter((x) => x !== val) : [...current, val])
  }

  const activeFilterCount = [
    stockFilter !== 'all',
    vendorFilters.length > 0,
    typeFilters.length > 0,
    catalogFilters.length > 0,
  ].filter(Boolean).length

  // Show skeletons by default while catalog state is unresolved/starting.
  // Only stop skeletons when loading is explicitly false and we still have no products.
  const showLoadingRows = storeProducts.length === 0 && storeInfo?.catalogLoading !== false

  const catalogWaitToastFired = useRef(false)
  useEffect(() => {
    if (!showLoadingRows) {
      catalogWaitToastFired.current = false
      return
    }
    if (mainView !== 'products') return
    if (catalogWaitToastFired.current) return
    catalogWaitToastFired.current = true
    emitSpykitToast('Fetching products')
  }, [showLoadingRows, mainView])

  // Delay the "no products" empty message slightly to avoid a 1-frame flash
  // between skeletons disappearing and data rows appearing.
  const [showEmptyMessage, setShowEmptyMessage] = useState(false)
  useEffect(() => {
    if (showLoadingRows || storeProducts.length > 0) {
      setShowEmptyMessage(false)
      return
    }
    const t = setTimeout(() => setShowEmptyMessage(true), 300)
    return () => clearTimeout(t)
  }, [showLoadingRows, storeProducts.length])

  const emptyHintToastFired = useRef(false)
  useEffect(() => {
    if (!showEmptyMessage || showLoadingRows || pageItems.length > 0) {
      emptyHintToastFired.current = false
      return
    }
    if (mainView !== 'products') return
    if (emptyHintToastFired.current) return
    emptyHintToastFired.current = true
    emitSpykitToast('Waiting for products — catalog may still be syncing.')
  }, [showEmptyMessage, showLoadingRows, mainView, pageItems.length])

  // Shared pagination strip props
  return (
    <div className="products-tab">
      {showFilters && (
        <FilterModal
          stockFilter={stockFilter}
          setStockFilter={setStockFilter}
          vendorFilters={vendorFilters}
          toggleVendorFilter={(v) => toggleValue(vendorFilters, v, setVendorFilters)}
          typeFilters={typeFilters}
          toggleTypeFilter={(v) => toggleValue(typeFilters, v, setTypeFilters)}
          catalogFilters={catalogFilters}
          toggleCatalogFilter={(v) => toggleValue(catalogFilters, v, setCatalogFilters)}
          vendors={vendors}
          types={types}
          collections={collectionRows}
          collectionsLinking={storeInfo?.catalogLinkingCollections === true}
          onClose={() => setShowFilters(false)}
          onReset={resetFilters}
        />
      )}

      <div className="dashboard-container">
        <div className="main-col">
          {/* ── Toolbar ───────────────────────────────────── */}
          <div className="pt-toolbar">
            <div className="search-box">
              <Search size={16} strokeWidth={2} aria-hidden />
              <input
                type="search"
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="toolbar-right">
              <div className="sub-nav" role="tablist">
                <button
                  type="button"
                  className={`sub-nav-item${mainView === 'products' ? ' active' : ''}`}
                  onClick={() => setMainView('products')}
                >
                  <Package size={14} strokeWidth={2} /> Products
                </button>
                <button
                  type="button"
                  className={`sub-nav-item${mainView === 'collections' ? ' active' : ''}`}
                  onClick={() => setMainView('collections')}
                >
                  <Folder size={14} strokeWidth={2} /> Collections
                </button>
              </div>
              <button
                type="button"
                className={`pt-btn pt-btn-outline${activeFilterCount ? ' pt-btn-outline-active' : ''}`}
                onClick={() => setShowFilters(true)}
                aria-label="Open filters"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M3 5H21L14 13V19L10 21V13L3 5Z" stroke="#7C6CF2" strokeWidth="2" strokeLinejoin="round" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className="filter-count-badge">{activeFilterCount}</span>
                )}
              </button>
            </div>
          </div>

          {/* ── Products table ────────────────────────────── */}
          {mainView === 'products' && (
            <PaginatedTable
              currentPage={currentPage}
              totalPages={totalPages}
              pageList={pageList}
              onPage={goToPage}
              perPage={perPage}
              onPerPage={setPerPage}
              totalItems={filteredProducts.length}
              itemLabel="products"
              floatingBar={
                selected.size > 0 ? (
                  <div className="floating-bar" role="status">
                    <div className="selection-count">
                      {selected.size} product{selected.size === 1 ? '' : 's'} selected
                    </div>
                    <button type="button" className="pt-btn btn-clear" onClick={() => setSelected(new Set())}>
                      Clear
                    </button>
                    <button
                      type="button"
                      className="pt-btn btn-export"
                      onClick={() => {
                        const all = new Map(productRows.map((r) => [r.id, r]))
                        const sel = [...selected].map((id) => all.get(id)).filter((r): r is ProductRow => r != null)
                        exportRowsJson(`spykit-products-${Date.now()}.json`, sel)
                      }}
                    >
                      Export selected <span aria-hidden>→</span>
                    </button>
                  </div>
                ) : undefined
              }
            >
              <thead>
                <tr>
                  <th className="checkbox-cell">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      className="custom-checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all on this page"
                    />
                  </th>
                  <th>Product</th>
                  <th>Vendor</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Compare Price</th>
                  <th>Collection</th>
                  <th>Status</th>
                  <th aria-hidden> </th>
                </tr>
              </thead>
              <tbody key={currentPage}>
                    {/* skeleton rows */}
                    {showLoadingRows &&
                      Array.from({ length: 10 }, (_, idx) => (
                        <tr key={`sk-${idx}`} className="pt-skeleton-row">
                          <td className="checkbox-cell"><span className="pt-skeleton pt-skeleton-box" /></td>
                          <td>
                            <div className="product-cell">
                              <span className="pt-skeleton pt-skeleton-thumb" />
                              <div className="product-info">
                                <span className="pt-skeleton pt-skeleton-text pt-skeleton-text-lg" />
                                <span className="pt-skeleton pt-skeleton-text" />
                              </div>
                            </div>
                          </td>
                          <td><span className="pt-skeleton pt-skeleton-pill" /></td>
                          <td><span className="pt-skeleton pt-skeleton-text" /></td>
                          <td><span className="pt-skeleton pt-skeleton-text" /></td>
                          <td><span className="pt-skeleton pt-skeleton-text" /></td>
                          <td><span className="pt-skeleton pt-skeleton-pill" /></td>
                          <td><span className="pt-skeleton pt-skeleton-box" /></td>
                        </tr>
                      ))}

                    {/* data rows — tbody key resets animation on every page change */}
                    {!showLoadingRows &&
                      pageItems.map((r, idx) => (
                        <tr
                          key={r.id}
                          className="pt-data-row"
                          style={{ animationDelay: `${idx * 18}ms` }}
                        >
                          <td className="checkbox-cell">
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={selected.has(r.id)}
                              onChange={() =>
                                setSelected((prev) => {
                                  const n = new Set(prev)
                                  n.has(r.id) ? n.delete(r.id) : n.add(r.id)
                                  return n
                                })
                              }
                              aria-label={`Select ${r.name}`}
                            />
                          </td>
                          <td>
                            <div className="product-cell">
                              {/* clickable thumbnail */}
                              <button
                                type="button"
                                className="product-img product-img-btn"
                                title="Open product page"
                                onClick={() => openPath(r.path)}
                                tabIndex={-1}
                              >
                                {r.imageUrl ? (
                                  <img src={r.imageUrl} alt="" loading="lazy" />
                                ) : (
                                  IMG_PLACEHOLDER
                                )}
                              </button>
                              <div className="product-info">
                                {/* clickable name with tooltip */}
                                <button
                                  type="button"
                                  className="product-name product-name-btn"
                                  title={r.name}
                                  onClick={() => openPath(r.path)}
                                >
                                  {r.name}
                                </button>
                                <span className="product-url">{r.path}</span>
                              </div>
                            </div>
                          </td>
                          <td><span className="pt-badge badge-vendor">{r.vendor}</span></td>
                          <td><span className="type-text">{r.productType}</span></td>
                          <td><span className="price-text">{r.price}</span></td>
                          <td><span className="type-text">{r.comparePrice}</span></td>
                          <td>
                            <span
                              className="type-text"
                              title={
                                r.collections.length
                                  ? r.collections
                                      .map((h) => collectionNameByHandle.get(h) ?? h)
                                      .join(', ')
                                  : '—'
                              }
                            >
                              {r.collections.length || 0}
                            </span>
                          </td>
                          <td>
                            <span className={`pt-badge ${r.status === 'In Stock' ? 'badge-success' : 'badge-error'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="link-icon"
                              title="Open product"
                              onClick={() => openPath(r.path)}
                            >
                              <Link2 size={16} strokeWidth={2} />
                            </button>
                          </td>
                        </tr>
                      ))}

                    {showEmptyMessage && !showLoadingRows && !pageItems.length && (
                      <tr>
                        <td colSpan={9} className="pt-empty" style={{ border: 'none' }}>
                          No products loaded yet. Keep this popup open while catalog sync finishes.
                        </td>
                      </tr>
                    )}
              </tbody>
            </PaginatedTable>
          )}

          {/* ── Collections table ─────────────────────────── */}
          {mainView === 'collections' && (
            <PaginatedTable
              currentPage={collectionsCurrentPage}
              totalPages={collectionsTotalPages}
              pageList={collectionsPageList}
              onPage={goToPage}
              perPage={perPage}
              onPerPage={setPerPage}
              totalItems={collectionRows.length}
              itemLabel="collections"
              tableClassName="products-table collections-main-table"
            >
              <thead>
                <tr>
                  <th>Collection</th>
                  <th>Handle</th>
                  <th>Products</th>
                  <th aria-hidden> </th>
                </tr>
              </thead>
              <tbody>
                {collectionPageItems.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="product-cell">
                        <div className="col-icon" style={{ marginRight: 0 }}>
                          <Folder size={14} strokeWidth={2} />
                        </div>
                        <div className="product-info">
                          <button
                            type="button"
                            className="collection-cell-title product-name-btn"
                            title={c.name}
                            onClick={() => openPath(c.path)}
                          >
                            {c.name}
                          </button>
                          <span className="product-url">{c.path}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="type-text">{c.handle || '—'}</span></td>
                    <td><span className="pt-badge badge-vendor">{c.productCount} products</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="link-icon" onClick={() => openPath(c.path)}>
                        <Link2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!collectionRows.length && (
                  <tr>
                    <td colSpan={4} className="pt-empty" style={{ border: 'none' }}>
                      No collections loaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </PaginatedTable>
          )}

        </div>
      </div>
    </div>
  )
}
