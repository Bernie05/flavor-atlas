/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_DATA_SOURCE?: 'http' | 'mock'
  readonly VITE_ROUTER_MODE?: 'browser' | 'memory'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
