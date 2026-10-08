/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_DATA_SOURCE?: 'http' | 'mock' | 'artifact'
  readonly VITE_ROUTER_MODE?: 'browser' | 'memory'
  readonly VITE_AI_SOURCE?: 'server' | 'artifact'
  readonly VITE_AUTH_SOURCE?: 'server' | 'artifact'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
