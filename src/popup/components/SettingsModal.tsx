import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { emitSpykitToast } from '../lib/spykitToastBus'
import { requestFullStoreRefreshFromPopup } from '../lib/popupStoreLoader'
import { refetchSupabaseStoresLibrary } from '../lib/supabaseThemeStores'

type Props = {
  open: boolean
  onClose: () => void
  /** Canonical store domain for copy in UI (optional). */
  storeDomainHint?: string | null
}

export default function SettingsModal({ open, onClose, storeDomainHint }: Props) {
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const modalHost = typeof document !== 'undefined' ? document.getElementById('spykit-modal-root') : null

  async function handleFetchData() {
    setBusy(true)
    emitSpykitToast('Refreshing this store — clearing cache and re-fetching…')
    try {
      const res = await requestFullStoreRefreshFromPopup()
      if (!res.ok) {
        emitSpykitToast(res.error ? `Refresh failed: ${res.error}` : 'Refresh failed — try again on the store tab.')
      } else {
        const w = window as unknown as { spykitLoadStore?: () => Promise<unknown> }
        void w.spykitLoadStore?.()
      }
    } catch (e) {
      emitSpykitToast(`Refresh failed: ${String(e)}`)
    }
    setBusy(false)
    onClose()
  }

  async function handleRefetchStoresLibrary() {
    setBusy(true)
    emitSpykitToast('Re-fetching stores library…')
    try {
      const res = await refetchSupabaseStoresLibrary(null)
      if (!res.ok) {
        emitSpykitToast(`Stores library re-fetch failed: ${res.error}`)
      } else {
        emitSpykitToast(`Stores library updated (${res.totalFetched.toLocaleString()} rows).`)
      }
    } catch (e) {
      emitSpykitToast(`Stores library re-fetch failed: ${String(e)}`)
    }
    setBusy(false)
    onClose()
  }

  const panel = (
    <div
      className="spykit-settings-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="spykit-settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="spykit-settings-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="spykit-settings-title">Settings</h2>
        <p>
          Force a full refresh for the <strong>store in the active browser tab</strong> only. This
          removes cached metadata and catalog rows for that shop, then re-fetches meta.json, theme,
          contacts, and the product/collection catalog.
          {storeDomainHint ? <span className="spykit-settings-domain"> ({storeDomainHint})</span> : null}
        </p>
        <div className="spykit-settings-actions">
          <button
            type="button"
            className="spykit-settings-fetch"
            disabled={busy}
            onClick={() => void handleFetchData()}
          >
            Fetch data
          </button>
          <button
            type="button"
            className="spykit-settings-refetch-library"
            disabled={busy}
            onClick={() => void handleRefetchStoresLibrary()}
          >
            Re-fetch stores library
          </button>
          <button type="button" className="spykit-settings-close" disabled={busy} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )

  if (modalHost) return createPortal(panel, modalHost)
  return panel
}
