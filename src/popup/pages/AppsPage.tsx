import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  BarChart2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageSquare,
  Search,
  Star,
  Tag,
  TrendingUp,
} from 'lucide-react'

type PillId = 'all' | 'marketing' | 'sales' | 'reviews' | 'analytics' | 'other'

const PILLS: Array<{ id: PillId; label: string }> = [
  { id: 'all', label: 'All (24)' },
  { id: 'marketing', label: 'Marketing (8)' },
  { id: 'sales', label: 'Sales (6)' },
  { id: 'reviews', label: 'Reviews (4)' },
  { id: 'analytics', label: 'Analytics (3)' },
  { id: 'other', label: 'Other (3)' },
]

function keyActivate(fn: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  }
}

export default function AppsPage() {
  const [pill, setPill] = useState<PillId>('all')
  const [page, setPage] = useState(1)

  return (
    <>
      <div className="apps-filter-bar">
        <div className="search-input">
          <Search size={16} color="var(--text-muted)" strokeWidth={2} aria-hidden />
          <input type="search" placeholder="Search apps by name..." defaultValue="" />
        </div>
        <div className="filter-pills">
          {PILLS.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              className={`pill${pill === p.id ? ' active' : ''}`}
              onClick={() => setPill(p.id)}
              onKeyDown={keyActivate(() => setPill(p.id))}
            >
              {p.id === 'other' ? (
                <span className="flex-center">
                  {p.label}
                  <ChevronDown size={14} strokeWidth={2} aria-hidden />
                </span>
              ) : (
                p.label
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          marginBottom: 12,
          padding: '0 4px',
        }}
      >
        <span>24 apps detected</span>
        <span style={{ color: 'var(--text-muted)' }}>Page 1 of 5</span>
      </div>

      <div className="apps-list">
        <div className="app-item">
          <div className="app-info-left">
            <div className="app-logo green">S</div>
            <div>
              <div className="app-name">Shopify Search & Discovery</div>
              <div className="app-rating">
                <Star className="star" fill="var(--warning)" strokeWidth={0} size={14} aria-hidden />
                4.6 (1,234 reviews)
              </div>
            </div>
          </div>
          <div className="app-category">
            <Tag size={16} color="var(--primary)" strokeWidth={2} aria-hidden />
            Sales
            <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} strokeWidth={2} aria-hidden />
          </div>
        </div>

        <div className="app-item">
          <div className="app-info-left">
            <div className="app-logo black" style={{ fontSize: 10 }}>
              klaviyo
            </div>
            <div>
              <div className="app-name">Klaviyo: Email Marketing & SMS</div>
              <div className="app-rating">
                <Star className="star" fill="var(--warning)" strokeWidth={0} size={14} aria-hidden />
                4.7 (2,512 reviews)
              </div>
            </div>
          </div>
          <div className="app-category">
            <Mail size={16} color="var(--success)" strokeWidth={2} aria-hidden />
            Marketing
            <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} strokeWidth={2} aria-hidden />
          </div>
        </div>

        <div className="app-item">
          <div className="app-info-left">
            <div className="app-logo teal" style={{ fontSize: 10 }}>
              LOOX
            </div>
            <div>
              <div className="app-name">Loox Product Reviews & Photos</div>
              <div className="app-rating">
                <Star className="star" fill="var(--warning)" strokeWidth={0} size={14} aria-hidden />
                4.9 (8,419 reviews)
              </div>
            </div>
          </div>
          <div className="app-category">
            <MessageSquare size={16} color="var(--info)" strokeWidth={2} aria-hidden />
            Reviews
            <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} strokeWidth={2} aria-hidden />
          </div>
        </div>

        <div className="app-item">
          <div className="app-info-left">
            <div className="app-logo yellow" style={{ fontSize: 10 }}>
              smile
            </div>
            <div>
              <div className="app-name">Smile: Loyalty & Rewards</div>
              <div className="app-rating">
                <Star className="star" fill="var(--warning)" strokeWidth={0} size={14} aria-hidden />
                4.8 (3,871 reviews)
              </div>
            </div>
          </div>
          <div className="app-category">
            <Tag size={16} color="var(--primary)" strokeWidth={2} aria-hidden />
            Marketing
            <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} strokeWidth={2} aria-hidden />
          </div>
        </div>

        <div className="app-item">
          <div className="app-info-left">
            <div
              className="app-logo"
              style={{
                background: 'white',
                border: '1px solid var(--border-dark)',
                color: 'var(--success)',
              }}
            >
              <TrendingUp size={18} strokeWidth={2} aria-hidden />
            </div>
            <div>
              <div className="app-name">Google & YouTube</div>
              <div className="app-rating">
                <Star className="star" fill="var(--warning)" strokeWidth={0} size={14} aria-hidden />
                4.5 (1,103 reviews)
              </div>
            </div>
          </div>
          <div className="app-category">
            <BarChart2 size={16} color="var(--warning)" strokeWidth={2} aria-hidden />
            Analytics
            <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} strokeWidth={2} aria-hidden />
          </div>
        </div>

        <div className="pagination flex-between">
          <div style={{ display: 'flex', gap: 4 }}>
            <div
              role="button"
              tabIndex={0}
              className="page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              onKeyDown={keyActivate(() => setPage((p) => Math.max(1, p - 1)))}
            >
              <ChevronLeft size={16} strokeWidth={2} aria-hidden />
            </div>
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                role="button"
                tabIndex={0}
                className={`page-btn${page === n ? ' active' : ''}`}
                onClick={() => setPage(n)}
                onKeyDown={keyActivate(() => setPage(n))}
              >
                {n}
              </div>
            ))}
            <div
              role="button"
              tabIndex={0}
              className="page-btn"
              onClick={() => setPage((p) => Math.min(5, p + 1))}
              onKeyDown={keyActivate(() => setPage((p) => Math.min(5, p + 1)))}
            >
              <ChevronRight size={16} strokeWidth={2} aria-hidden />
            </div>
          </div>
          <div className="btn" style={{ padding: '4px 12px' }}>
            5 per page
            <ChevronDown size={14} strokeWidth={2} aria-hidden />
          </div>
        </div>
      </div>
    </>
  )
}
