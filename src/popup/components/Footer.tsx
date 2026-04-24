import { Info, ShieldCheck, Star } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-left">
        <div className="shield-icon">
          <ShieldCheck size={22} strokeWidth={2} aria-hidden />
        </div>
        <div className="footer-text">
          <p>Minimal permissions.</p>
          <p>Your data stays private.</p>
        </div>
      </div>
      <div className="footer-right">
        <div className="sync-info">
          <div className="sync-text">
            100 free syncs left
            <Info size={14} strokeWidth={2} style={{ color: 'var(--text-light)' }} aria-hidden />
          </div>
          <div className="progress-bar">
            <div className="progress-fill" />
          </div>
        </div>
        <button type="button" className="btn btn-primary">
          <Star size={16} strokeWidth={2} aria-hidden />
          Upgrade
        </button>
      </div>
    </footer>
  )
}
