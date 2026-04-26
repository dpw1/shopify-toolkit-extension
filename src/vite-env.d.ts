/// <reference types="vite/client" />

declare const __APPS_CATALOG_JSON_URL__: string

interface ImportMetaEnv {
  readonly VITE_APPS_CATALOG_JSON_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
