import { useEffect, useMemo, useRef, useState } from 'react'
import type { CatalogCollectionRow, CatalogProductRow, ExtMessage, StoreInfo } from '../../types'
import { Search, Package, Folder, ChevronLeft, ChevronRight, Link2, RefreshCw, X } from 'lucide-react'
import './productsTab.css'

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductRow = {
  id: number
  name: string
  path: string
  vendor: string
  productType: string
  price: string
  status: 'In Stock' | 'Out of Stock'
  imageUrl?: string
  collections: string[]
}

type CollectionRow = {
  id: number
  name: string
  path: string
  productCount: string
  handle: string
}

type StockFilter = 'all' | 'in' | 'out'
type PerPage = 10 | 25 | 50

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

  const rawP = p as Record<string, unknown>
  const collections = Array.isArray(rawP._collections)
    ? (rawP._collections as string[])
    : []

  return { id: p.id, name: title, path, vendor, productType, price, status, imageUrl, collections }
}

function collectionFromRow(c: CatalogCollectionRow, idx: number): CollectionRow {
  const title = c.title != null && String(c.title) !== '' ? String(c.title) : `Collection ${idx + 1}`
  const handle = String(c.handle ?? '')
  const path = handle ? `/collections/${handle}` : '—'
  const pc = (c as { products_count?: number }).products_count
  const productCount = typeof pc === 'number' ? String(pc) : '—'
  return { id: c.id, name: title, path, productCount, handle }
}

function formatRelative(t: number): string {
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  return `${Math.floor(h / 24)} day(s) ago`
}

function buildPageList(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 0) return []
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const want = new Set(
    [1, total, current, current - 1, current + 1].filter((n) => n >= 1 && n <= total),
  )
  for (let i = 1; i <= 5; i++) want.add(i)
  const sorted = [...want].sort((a, b) => a - b)
  const out: (number | 'ellipsis')[] = []
  let prev = 0
  for (const p of sorted) {
    if (p - prev > 1) out.push('ellipsis')
    out.push(p)
    prev = p
  }
  return out
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

// ─── Pagination strip component ───────────────────────────────────────────────

function PaginationStrip({
  currentPage,
  totalPages,
  pageList,
  onPage,
}: {
  currentPage: number
  totalPages: number
  pageList: (number | 'ellipsis')[]
  onPage: (p: number) => void
}) {
  return (
    <div className="page-controls" aria-label="Pagination">
      <button
        type="button"
        className="page-btn"
        disabled={currentPage <= 1}
        onClick={() => onPage(Math.max(1, currentPage - 1))}
        aria-label="Previous page"
      >
        <ChevronLeft size={14} strokeWidth={2} />
      </button>
      {pageList.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e-${i}`} className="page-btn ellipsis" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`page-btn${p === currentPage ? ' active' : ''}`}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className="page-btn"
        disabled={currentPage >= totalPages}
        onClick={() => onPage(Math.min(totalPages, currentPage + 1))}
        aria-label="Next page"
      >
        <ChevronRight size={14} strokeWidth={2} />
      </button>
    </div>
  )
}

// ─── Filter modal ─────────────────────────────────────────────────────────────

function FilterModal({
  stockFilter,
  setStockFilter,
  vendorFilter,
  setVendorFilter,
  typeFilter,
  setTypeFilter,
  catalogFilter,
  setCatalogFilter,
  vendors,
  types,
  collections,
  onClose,
  onReset,
}: {
  stockFilter: StockFilter
  setStockFilter: (v: StockFilter) => void
  vendorFilter: string
  setVendorFilter: (v: string) => void
  typeFilter: string
  setTypeFilter: (v: string) => void
  catalogFilter: string
  setCatalogFilter: (v: string) => void
  vendors: string[]
  types: string[]
  collections: CollectionRow[]
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
    vendorFilter !== '__all__',
    typeFilter !== '__all__',
    catalogFilter !== '__all__',
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

          {/* Catalog */}
          <div className="filter-section">
            <div className="filter-section-label">Catalog (Collection)</div>
            <select
              className="filter-full-select"
              value={catalogFilter}
              onChange={(e) => setCatalogFilter(e.target.value)}
            >
              <option value="__all__">All collections</option>
              {collections.map((c) => (
                <option key={c.id} value={c.handle}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor */}
          <div className="filter-section">
            <div className="filter-section-label">Vendor</div>
            <select
              className="filter-full-select"
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
            >
              <option value="__all__">All vendors</option>
              {vendors.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div className="filter-section">
            <div className="filter-section-label">Product Type</div>
            <select
              className="filter-full-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="__all__">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
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

type Props = { storeInfo: StoreInfo | null }

export default function ScraperPage({ storeInfo }: Props) {
  const [storeProducts, setStoreProducts] = useState<CatalogProductRow[]>(
    window.storeData?.products ?? [],
  )
  const [storeCollections, setStoreCollections] = useState<CatalogCollectionRow[]>(
    window.storeData?.collections ?? [],
  )

  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [vendorFilter, setVendorFilter] = useState('__all__')
  const [typeFilter, setTypeFilter] = useState('__all__')
  const [catalogFilter, setCatalogFilter] = useState('__all__')
  const [showFilters, setShowFilters] = useState(false)
  const [mainView, setMainView] = useState<'products' | 'collections'>('products')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<PerPage>(10)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // Sync from storeData whenever storeInfo changes (background wrote new data)
  useEffect(() => {
    setStoreProducts(window.storeData?.products ?? [])
    setStoreCollections(window.storeData?.collections ?? [])
  }, [storeInfo?.detectedAt, storeInfo?.productsSample, storeInfo?.collectionsSample])

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

  const filteredProducts = useMemo(() => {
    let rows = productRows
    const q = search.trim().toLowerCase()
    if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.vendor.toLowerCase().includes(q))
    if (stockFilter === 'in') rows = rows.filter((r) => r.status === 'In Stock')
    if (stockFilter === 'out') rows = rows.filter((r) => r.status === 'Out of Stock')
    if (vendorFilter !== '__all__') rows = rows.filter((r) => r.vendor === vendorFilter)
    if (typeFilter !== '__all__') rows = rows.filter((r) => r.productType === typeFilter)
    if (catalogFilter !== '__all__') rows = rows.filter((r) => r.collections.includes(catalogFilter))
    return rows
  }, [productRows, search, stockFilter, vendorFilter, typeFilter, catalogFilter])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * perPage
    return filteredProducts.slice(start, start + perPage)
  }, [filteredProducts, currentPage, perPage])
  const pageList = useMemo(() => buildPageList(currentPage, totalPages), [currentPage, totalPages])

  useEffect(() => { setPage(1) }, [search, stockFilter, vendorFilter, typeFilter, catalogFilter, perPage, mainView])

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
    window.open(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, '_blank')
  }

  function onReSync() {
    try {
      chrome.runtime.sendMessage({ type: 'SYNC_CATALOG_ON_POPUP', from: 'popup' } satisfies ExtMessage)
    } catch { /* no-op */ }
  }

  function resetFilters() {
    setStockFilter('all')
    setVendorFilter('__all__')
    setTypeFilter('__all__')
    setCatalogFilter('__all__')
  }

  const activeFilterCount = [
    stockFilter !== 'all',
    vendorFilter !== '__all__',
    typeFilter !== '__all__',
    catalogFilter !== '__all__',
  ].filter(Boolean).length

  const showLoadingRows = storeInfo?.catalogLoading === true && storeProducts.length === 0

  // Shared pagination strip props
  const paginationProps = { currentPage, totalPages, pageList, onPage: setPage }

  return (
    <div className="products-tab">
      {showFilters && (
        <FilterModal
          stockFilter={stockFilter}
          setStockFilter={setStockFilter}
          vendorFilter={vendorFilter}
          setVendorFilter={setVendorFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          catalogFilter={catalogFilter}
          setCatalogFilter={setCatalogFilter}
          vendors={vendors}
          types={types}
          collections={collectionRows}
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

          {/* ── Sub-nav ───────────────────────────────────── */}
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

          {/* ── Products table ────────────────────────────── */}
          {mainView === 'products' && (
            <>
              {/* top pagination */}
              <div className="pagination-top">
                <span className="pagination-count">
                  {filteredProducts.length
                    ? `${(currentPage - 1) * perPage + 1}–${Math.min(currentPage * perPage, filteredProducts.length)} of ${filteredProducts.length.toLocaleString()} products`
                    : '0 products'}
                </span>
                <PaginationStrip {...paginationProps} />
              </div>

              <div className="table-card">
                <table className="products-table">
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
                      <th>Status</th>
                      <th aria-hidden> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* skeleton rows */}
                    {showLoadingRows &&
                      Array.from({ length: 3 }, (_, idx) => (
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
                          <td><span className="pt-skeleton pt-skeleton-pill" /></td>
                          <td><span className="pt-skeleton pt-skeleton-box" /></td>
                        </tr>
                      ))}

                    {/* data rows */}
                    {!showLoadingRows &&
                      pageItems.map((r) => (
                        <tr key={r.id}>
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

                    {!showLoadingRows && !pageItems.length && (
                      <tr>
                        <td colSpan={7} className="pt-empty" style={{ border: 'none' }}>
                          No products loaded yet. Keep this popup open while catalog sync finishes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* floating selection bar */}
              {selected.size > 0 && (
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
                      const rows = [...selected].map((id) => all.get(id)).filter((r): r is ProductRow => r != null)
                      exportRowsJson(`spykit-products-${Date.now()}.json`, rows)
                    }}
                  >
                    Export selected <span aria-hidden>→</span>
                  </button>
                </div>
              )}

              {/* bottom pagination */}
              <div className="pagination-footer">
                <div>
                  {filteredProducts.length
                    ? `Showing ${(currentPage - 1) * perPage + 1}–${Math.min(currentPage * perPage, filteredProducts.length)} of ${filteredProducts.length.toLocaleString()} products`
                    : '0 products'}
                </div>
                <PaginationStrip {...paginationProps} />
                <div className="per-page">
                  <span>Per page</span>
                  <select
                    className="per-page-select"
                    value={perPage}
                    onChange={(e) => setPerPage(Number(e.target.value) as PerPage)}
                    aria-label="Rows per page"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* ── Collections table ─────────────────────────── */}
          {mainView === 'collections' && (
            <div className="table-card">
              <table className="products-table collections-main-table">
                <thead>
                  <tr>
                    <th>Collection</th>
                    <th>Handle</th>
                    <th>Products</th>
                    <th aria-hidden> </th>
                  </tr>
                </thead>
                <tbody>
                  {collectionRows.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="product-cell">
                          <div className="col-icon" style={{ marginRight: 0 }}>
                            <Folder size={14} strokeWidth={2} />
                          </div>
                          <div className="product-info">
                            <span className="collection-cell-title">{c.name}</span>
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
              </table>
            </div>
          )}

          {/* ── Meta footer ───────────────────────────────── */}
          <div className="meta-footer">
            {storeInfo?.detectedAt != null && (
              <>
                <span>Data updated {formatRelative(storeInfo.detectedAt)}</span>
                <span>•</span>
              </>
            )}
            <button type="button" className="re-scrape" onClick={onReSync}>
              <RefreshCw size={12} strokeWidth={2} />
              Re-sync catalog
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
