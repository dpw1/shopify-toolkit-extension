import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ExtMessage } from '../../types'
import { emitSpykitToast } from '../lib/spykitToastBus'

type Props = {
  open: boolean
  onClose: () => void
  /** Canonical store domain for copy in UI (optional). */
  storeDomainHint?: string | null
}

export default function SettingsModal({ open, onClose, storeDomainHint }: Props) {
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
    emitSpykitToast('Refreshing this store — clearing cache and re-fetching…')
    try {
      const res = await new Promise<{ ok?: boolean; error?: string }>((resolve) => {
        try {
          chrome.runtime.sendMessage(
            { type: 'FORCE_REFRESH_STORE', from: 'popup' } satisfies ExtMessage,
            (r) => {
              if (chrome.runtime.lastError) {
                resolve({ ok: false, error: chrome.runtime.lastError.message })
                return
              }
              resolve((r as { ok?: boolean; error?: string }) ?? { ok: false })
            },
          )
        } catch (e) {
          resolve({ ok: false, error: String(e) })
        }
      })
      if (!res.ok) {
        emitSpykitToast(res.error ? `Refresh failed: ${res.error}` : 'Refresh failed — try again on the store tab.')
      } else {
        const w = window as unknown as { spykitLoadStore?: () => Promise<unknown> }
        void w.spykitLoadStore?.()
      }
    } catch (e) {
      emitSpykitToast(`Refresh failed: ${String(e)}`)
    }
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
          <button type="button" className="spykit-settings-fetch" onClick={() => void handleFetchData()}>
            Fetch data
          </button>
          <button type="button" className="spykit-settings-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )

  if (modalHost) return createPortal(panel, modalHost)
  return panel
}
