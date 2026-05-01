import { CheckCircle2, Info, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { subscribeSpykitToast, type ToastPayload, type ToastType } from '../lib/spykitToastBus'

const VISIBLE_MS = 6000
const EXIT_MS = 280
const MAX_TOASTS = 3

type ToastItem = { id: string; message: string; type: ToastType; exiting: boolean }

export default function ToastStack() {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, number>>(new Map())

  const startExit = useCallback((id: string) => {
    const existing = timers.current.get(id)
    if (existing) window.clearTimeout(existing)
    timers.current.delete(id)

    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, exiting: true } : x)))

    const t = window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id))
      timers.current.delete(`exit-${id}`)
    }, EXIT_MS)
    timers.current.set(`exit-${id}`, t)
  }, [])

  const push = useCallback(
    ({ message, type }: ToastPayload) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setItems((prev) => {
        if (prev.some((x) => x.message === message && !x.exiting)) return prev
        const next = [...prev, { id, message, type, exiting: false }]
        // Keep only the most recent MAX_TOASTS items (drop oldest when over limit)
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next
      })
      const t = window.setTimeout(() => {
        timers.current.delete(id)
        startExit(id)
      }, VISIBLE_MS)
      timers.current.set(id, t)
    },
    [startExit],
  )

  useEffect(() => {
    const unsubBus = subscribeSpykitToast(push)

    const onStorage = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== 'local' || !changes.spykitToast?.newValue) return
      const nv = changes.spykitToast.newValue as { message?: string } | null
      if (nv && typeof nv.message === 'string' && nv.message.trim()) {
        push({ message: nv.message.trim(), type: 'info' })
      }
    }
    chrome.storage.onChanged.addListener(onStorage)

    return () => {
      unsubBus()
      chrome.storage.onChanged.removeListener(onStorage)
      for (const t of timers.current.values()) window.clearTimeout(t)
      timers.current.clear()
    }
  }, [push])

  const mount = typeof document !== 'undefined' ? document.getElementById('spykit-toast-root') : null

  const stack = (
    <div className="spykit-toast-stack" aria-live="polite" aria-relevant="additions text">
      {items.map((t) => (
        <div
          key={t.id}
          className={`spykit-toast spykit-toast--${t.type}${t.exiting ? ' spykit-toast--exiting' : ''}`}
          role="status"
        >
          {t.type === 'success' ? (
            <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} aria-hidden />
          ) : (
            <Info size={16} style={{ color: 'var(--info)', flexShrink: 0 }} aria-hidden />
          )}
          <span className="spykit-toast-message">{t.message}</span>
          <button
            type="button"
            className="spykit-toast-close"
            aria-label="Dismiss"
            onClick={() => startExit(t.id)}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )

  if (!items.length) return null
  if (mount) return createPortal(stack, mount)
  return stack
}
