/**
 * PaginatedTable — reusable paginated-table shell.
 *
 * Renders:
 *   • top row: item-count label + pagination strip
 *   • (optional) debug "Test Goto" bar — currently disabled; see comment in component JSX
 *   • .table-card wrapper around the <table> passed as children
 *   • floating slot (e.g. selection bar) between table and footer
 *   • bottom row: "Showing X" label + pagination strip + per-page selector
 *
 * Usage:
 *   <PaginatedTable currentPage={…} totalPages={…} …>
 *     <thead><tr>…</tr></thead>
 *     <tbody key={currentPage}>…</tbody>
 *   </PaginatedTable>
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'

// ─── Re-exported helpers (used by callers to derive page lists) ───────────────

export type PerPage = 10 | 25 | 50

export function buildPageList(current: number, total: number): (number | 'ellipsis')[] {
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

export function paginationLabel(currentPage: number, perPage: number, total: number, noun: string): string {
  if (!total) return `0 ${noun}`
  const start = (currentPage - 1) * perPage + 1
  const end = Math.min(currentPage * perPage, total)
  return `${start}–${end} of ${total.toLocaleString()} ${noun}`
}

// ─── Pagination strip ─────────────────────────────────────────────────────────

export function PaginationStrip({
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

// ─── Main component ───────────────────────────────────────────────────────────

interface PaginatedTableProps {
  currentPage: number
  totalPages: number
  pageList: (number | 'ellipsis')[]
  onPage: (page: number) => void
  perPage: PerPage
  onPerPage: (v: PerPage) => void
  totalItems: number
  itemLabel: string
  tableClassName?: string
  /** Slot rendered between table and footer (e.g. floating selection bar). */
  floatingBar?: React.ReactNode
  children: React.ReactNode
}

export function PaginatedTable({
  currentPage,
  totalPages,
  pageList,
  onPage,
  perPage,
  onPerPage,
  totalItems,
  itemLabel,
  tableClassName = 'products-table',
  floatingBar,
  children,
}: PaginatedTableProps) {
  const stripProps = { currentPage, totalPages, pageList, onPage }

  return (
    <>
      {/* ── Top pagination row ────────────────────────── */}
      <div className="pagination-top">
        <span className="pagination-count">
          {paginationLabel(currentPage, perPage, totalItems, itemLabel)}
        </span>
        <PaginationStrip {...stripProps} />
      </div>

      {/* ── Test Goto (debug) — commented out; re-enable: add `useState`, `debug?: boolean` prop,
          `const [testPageInput, setTestPageInput] = useState('')`, handleTestGoto, and:
          {debug && ( ...copy block from git history... )}
      */}

      {/* ── Table ─────────────────────────────────────── */}
      <div className="table-card">
        <table className={tableClassName}>{children}</table>
      </div>

      {/* ── Floating slot (e.g. selection bar) ────────── */}
      {floatingBar}

      {/* ── Bottom pagination row ─────────────────────── */}
      <div className="pagination-footer">
        <div>{`Showing ${paginationLabel(currentPage, perPage, totalItems, itemLabel)}`}</div>
        <PaginationStrip {...stripProps} />
        <div className="per-page">
          <span>Per page</span>
          <select
            className="per-page-select"
            value={perPage}
            onChange={(e) => onPerPage(Number(e.target.value) as PerPage)}
            aria-label="Rows per page"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    </>
  )
}
