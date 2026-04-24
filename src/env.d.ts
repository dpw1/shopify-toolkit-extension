/// <reference types="vite/client" />

import type { SpyKitStoreData } from './types'

/**
 * Build-time constants injected by Vite's `define` option in vite.config.ts.
 * Declaring them here gives TypeScript full type information everywhere.
 */
declare const __APP_MODE__: string
declare const __APP_VERSION__: string
declare const __API_BASE_URL__: string

declare global {
  interface Window {
    /** SpyKit snapshot — updated from the popup when `storeInfo` changes */
    storeData?: SpyKitStoreData
  }
}

export {}
