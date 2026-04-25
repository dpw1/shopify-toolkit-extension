/** Popup-local toast bus (non-React modules can emit without a React context). */

type ToastHandler = (message: string) => void

const handlers = new Set<ToastHandler>()

export function subscribeSpykitToast(handler: ToastHandler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

export function emitSpykitToast(message: string): void {
  for (const h of handlers) h(message)
}
