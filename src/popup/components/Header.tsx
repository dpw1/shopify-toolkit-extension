import {
  MoreVertical,
  Moon,
  ScanEye,
  Settings,
  Star,
  Sun,
} from 'lucide-react'

interface HeaderProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export default function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="header">
      <div className="brand">
        <ScanEye className="brand-icon" strokeWidth={2} aria-hidden />
        <span className="brand-title">Shopify SpyKit</span>
        <span className="badge-pro">
          <Star style={{ width: 12, height: 12 }} strokeWidth={2} aria-hidden />
          Pro
        </span>
      </div>
      <div className="header-actions">
        <button type="button" aria-label="Settings">
          <Settings size={20} strokeWidth={2} />
        </button>
        <button type="button" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? (
            <Sun size={20} strokeWidth={2} />
          ) : (
            <Moon size={20} strokeWidth={2} />
          )}
        </button>
        <button type="button" aria-label="More options">
          <MoreVertical size={20} strokeWidth={2} />
        </button>
      </div>
    </header>
  )
}
