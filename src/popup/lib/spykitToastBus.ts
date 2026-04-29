/** Popup-local toast bus (non-React modules can emit without a React context). */

export type ToastType = 'info' | 'success'

export type ToastPayload = { message: string; type: ToastType }

type ToastHandler = (payload: ToastPayload) => void

const handlers = new Set<ToastHandler>()

export function subscribeSpykitToast(handler: ToastHandler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

function emit(payload: ToastPayload): void {
  for (const h of handlers) h(payload)
}

export type EmitSpykitToastOptions = {
  /** When true, append ` [stored]` (data read from chrome.storage / IndexedDB, not a fresh network pull). */
  fromStored?: boolean
}

export function emitSpykitToast(message: string, options?: EmitSpykitToastOptions): void {
  const suffix = options?.fromStored ? ' [stored]' : ''
  emit({ message: message + suffix, type: 'info' })
}

export function emitSpykitSuccess(message: string): void {
  emit({ message, type: 'success' })
}
