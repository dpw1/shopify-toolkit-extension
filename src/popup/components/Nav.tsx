import type { KeyboardEvent } from 'react'
import {
  Download,
  FileOutput,
  GitCompareArrows,
  Grid2x2,
  Home,
  Package,
  Palette,
} from 'lucide-react'

export type PageId =
  | 'store'
  | 'theme'
  | 'compare'
  | 'apps'
  | 'scraper'
  | 'downloads'
  | 'export'

interface NavProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
  /** When false, tabs are non-interactive (e.g. active tab is not a Shopify storefront). */
  tabsEnabled?: boolean
}

const navItems: Array<{ id: PageId; label: string; Icon: typeof Home }> = [
  { id: 'store', label: 'Store', Icon: Home },
  { id: 'theme', label: 'Theme', Icon: Palette },
  { id: 'compare', label: 'Compare', Icon: GitCompareArrows },
  { id: 'apps', label: 'Apps', Icon: Grid2x2 },
  { id: 'scraper', label: 'Products', Icon: Package },
  { id: 'downloads', label: 'Downloads', Icon: Download },
  { id: 'export', label: 'Export', Icon: FileOutput },
]

export default function Nav({ activePage, onNavigate, tabsEnabled = true }: NavProps) {
  function keyActivate(fn: () => void) {
    return (e: KeyboardEvent) => {
      if (!tabsEnabled) return
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
          tabIndex={tabsEnabled ? 0 : -1}
          aria-selected={activePage === id}
          aria-disabled={!tabsEnabled}
          className={`tab${activePage === id ? ' active' : ''}${!tabsEnabled ? ' tab--disabled' : ''}`}
          onClick={() => {
            if (!tabsEnabled) return
            onNavigate(id)
          }}
          onKeyDown={keyActivate(() => onNavigate(id))}
        >
          <Icon strokeWidth={2} />
          {label}
        </div>
      ))}
    </nav>
  )
}
