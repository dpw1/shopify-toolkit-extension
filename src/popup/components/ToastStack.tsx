import { Info } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { subscribeSpykitToast } from '../lib/spykitToastBus'

const DEFAULT_MS = 6500

type ToastItem = { id: string; message: string }

export default function ToastStack() {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, number>>(new Map())

  const push = useCallback((message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setItems((prev) => [...prev, { id, message }])
    const t = window.setTimeout(() => {
      timers.current.delete(id)
      setItems((prev) => prev.filter((x) => x.id !== id))
    }, DEFAULT_MS)
    timers.current.set(id, t)
  }, [])

  useEffect(() => {
    const unsubBus = subscribeSpykitToast(push)

    const onStorage = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== 'local' || !changes.spykitToast?.newValue) return
      const nv = changes.spykitToast.newValue as { message?: string } | null
      if (nv && typeof nv.message === 'string' && nv.message.trim()) push(nv.message.trim())
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
        <div key={t.id} className="spykit-toast spykit-toast--info" role="status">
          <Info size={16} style={{ color: 'var(--info)', flexShrink: 0 }} aria-hidden />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )

  if (!items.length) return null
  if (mount) return createPortal(stack, mount)
  return stack
}
