import type { KeyboardEvent } from 'react'
import {
  Download,
  FileOutput,
  Grid2x2,
  Home,
  Package,
  Palette,
} from 'lucide-react'

export type PageId =
  | 'stores'
  | 'theme'
  | 'apps'
  | 'scraper'
  | 'downloads'
  | 'export'

interface NavProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
}

const navItems: Array<{ id: PageId; label: string; Icon: typeof Home }> = [
  { id: 'stores', label: 'Stores', Icon: Home },
  { id: 'theme', label: 'Theme', Icon: Palette },
  { id: 'apps', label: 'Apps', Icon: Grid2x2 },
  { id: 'scraper', label: 'Products', Icon: Package },
  { id: 'downloads', label: 'Downloads', Icon: Download },
  { id: 'export', label: 'Export', Icon: FileOutput },
]

export default function Nav({ activePage, onNavigate }: NavProps) {
  function keyActivate(fn: () => void) {
    return (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        fn()
      }
    }
  }

  return (
    <nav className="nav-tabs" role="tablist">
      {navItems.map(({ id, label, Icon }) => (
        <div
          key={id}
          role="tab"
          tabIndex={0}
          aria-selected={activePage === id}
          className={`tab${activePage === id ? ' active' : ''}`}
          onClick={() => onNavigate(id)}
          onKeyDown={keyActivate(() => onNavigate(id))}
        >
          <Icon strokeWidth={2} />
          {label}
        </div>
      ))}
    </nav>
  )
}
