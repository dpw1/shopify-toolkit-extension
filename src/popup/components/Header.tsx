import { Settings, Star } from 'lucide-react'

interface HeaderProps {
  onOpenSettings?: () => void
}

export default function Header({ onOpenSettings }: HeaderProps) {
  return (
    <header className="header">
      <div className="brand">
        <img className="brand-logo" src="/icons/icon128.png" alt="Shopify Spy Toolkit logo" />
        <span className="brand-title">Shopify Spy Toolkit</span>
        <span className="badge-pro">
          <Star style={{ width: 12, height: 12 }} strokeWidth={2} aria-hidden />
          Pro
        </span>
      </div>
      <div className="header-actions">
        <button type="button" aria-label="Settings" onClick={() => onOpenSettings?.()}>
          <Settings size={20} strokeWidth={2} />
        </button>
        {/* <button type="button" aria-label="More options">
          <MoreVertical size={20} strokeWidth={2} />
        </button> */}
      </div>
    </header>
  )
}
