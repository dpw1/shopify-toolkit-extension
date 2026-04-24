import type { StoreInfo } from '../../types'
import {
  Activity,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Code,
  FileCode2,
  FileText,
  Folder,
  HardDrive,
  Image,
  LayoutGrid,
  LayoutTemplate,
  LifeBuoy,
  Pencil,
  ShieldCheck,
  ShoppingBag,
  User,
  Users,
} from 'lucide-react'

interface ThemePageProps {
  storeInfo: StoreInfo | null
}

export default function ThemePage({ storeInfo }: ThemePageProps) {
  const t = storeInfo?.theme
  const displayName = t?.name ?? '—'
  const versionLine = t
    ? `Version ${t.version || '—'} \u2022 Role: ${t.role ?? '—'}${t.themeRenamed && t.themeRenamed !== t.name ? ` \u2022 Renamed: ${t.themeRenamed}` : ''}`
    : 'Open a Shopify storefront to load theme details.'

  return (
    <>
      <div className="theme-layout">
        <div className="theme-info-middle">
          <div style={{ marginBottom: 12 }}>
            <span
              className="tag"
              style={{
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'inline-flex',
              }}
            >
              Live theme
            </span>
          </div>
          <div className="theme-info-header">
            <h2>
              {displayName}
              <Pencil size={16} color="var(--text-muted)" strokeWidth={2} style={{ cursor: 'pointer' }} aria-hidden />
            </h2>
            <p className="flex-center" style={{ color: 'var(--text-main)', fontWeight: 500, marginBottom: 16 }}>
              <ShoppingBag size={16} color="var(--success)" strokeWidth={2} aria-hidden />
              by {t?.author ?? 'Shopify'}
            </p>
            <p style={{ marginBottom: 16 }}>{versionLine}</p>
            <button type="button" className="theme-link flex-center">
              View on Shopify Theme Store
              <ArrowUpRight size={16} strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>

        <div className="theme-side-cards">
          <div className="side-card">
            <div className="side-card-icon purple">
              <Users size={20} strokeWidth={2} aria-hidden />
            </div>
            <div>
              <h4>{t?.themeId != null ? String(t.themeId) : '—'}</h4>
              <p>Theme ID</p>
            </div>
          </div>
          <div className="side-card">
            <div className="side-card-icon green">
              <ShieldCheck size={20} strokeWidth={2} aria-hidden />
            </div>
            <div>
              <h4>{t?.isOS2 ? 'OS 2.0' : 'Unknown'}</h4>
              <p>{t?.isOS2 ? 'Online Store 2.0 signals' : 'Sections API not detected'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="theme-meta-grid">
        <div className="meta-item">
          <span className="meta-label">
            <User size={14} strokeWidth={2} aria-hidden />
            Author
          </span>
          <span className="meta-value">{t?.author ?? '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">
            <FileText size={14} strokeWidth={2} aria-hidden />
            Schema
          </span>
          <span className="meta-value">{t?.schemaName ?? t?.name ?? '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">
            <LayoutGrid size={14} strokeWidth={2} aria-hidden />
            Theme store ID
          </span>
          <span className="meta-value">{t?.themeStoreId != null ? String(t.themeStoreId) : '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">
            <Calendar size={14} strokeWidth={2} aria-hidden />
            Handle
          </span>
          <span className="meta-value">{t?.themeHandle ?? '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">
            <HardDrive size={14} strokeWidth={2} aria-hidden />
            Theme rename
          </span>
          <span className="meta-value">{t?.themeRenamed ?? '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">
            <LifeBuoy size={14} strokeWidth={2} aria-hidden />
            Support
          </span>
          <a href="#" className="theme-link flex-center" style={{ fontSize: 'var(--text-sm)' }} onClick={(e) => e.preventDefault()}>
            Documentation
            <ArrowUpRight size={14} strokeWidth={2} aria-hidden />
          </a>
        </div>
      </div>

      <div className="card">
        <div className="flex-between">
          <div>
            <h3
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'var(--text-main)',
              }}
            >
              <FileCode2 size={16} strokeWidth={2} aria-hidden />
              Theme Files
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Key files and structure information
            </p>
          </div>
          <button type="button" className="btn">
            View all files
            <ChevronRight size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="theme-files-grid">
          <div className="file-card" style={{ background: 'var(--bg-hover)' }}>
            <Activity className="file-icon" style={{ color: 'var(--info)' }} size={24} strokeWidth={2} aria-hidden />
            <div className="file-count">312</div>
            <div className="file-type">.liquid files</div>
          </div>
          <div className="file-card">
            <Folder className="file-icon" style={{ color: 'var(--warning)' }} size={24} strokeWidth={2} aria-hidden />
            <div className="file-count">89</div>
            <div className="file-type">/sections</div>
          </div>
          <div className="file-card">
            <Code className="file-icon" style={{ color: 'var(--primary)' }} size={24} strokeWidth={2} aria-hidden />
            <div className="file-count">54</div>
            <div className="file-type">/snippets</div>
          </div>
          <div className="file-card">
            <Image className="file-icon" style={{ color: 'var(--success)' }} size={24} strokeWidth={2} aria-hidden />
            <div className="file-count">186</div>
            <div className="file-type">/assets</div>
          </div>
          <div className="file-card">
            <LayoutTemplate className="file-icon" style={{ color: '#f97316' }} size={24} strokeWidth={2} aria-hidden />
            <div className="file-count">28</div>
            <div className="file-type">/templates</div>
          </div>
        </div>
      </div>
    </>
  )
}
