import { GitCompareArrows } from 'lucide-react'

export default function ComparePage() {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
      <GitCompareArrows
        size={40}
        strokeWidth={1.5}
        style={{ color: 'var(--primary)', margin: '0 auto 12px' }}
        aria-hidden
      />
      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 8, color: 'var(--text-main)' }}>
        Compare
      </h3>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto' }}>
        Side-by-side storefront comparisons will appear here.
      </p>
    </div>
  )
}
