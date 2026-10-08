// Centralize environment access so the rest of the app never reads
// import.meta.env directly. Swapping environments means changing one file.

interface AppConfig {
  /** Base URL of the data API: json-server behind the server's /api/data gateway. */
  apiUrl: string
  /** 'http' talks to json-server; 'mock' keeps the seed in memory; 'artifact' adds changes saved in the artifact's db. */
  dataSource: 'http' | 'mock' | 'artifact'
  /** 'memory' keeps routes out of the URL, for hosts that own the URL (phone demo). */
  routerMode: 'browser' | 'memory'
  /** 'server' calls /api/ai; 'artifact' asks Claude through the claude.ai viewer (phone demo). */
  aiSource: 'server' | 'artifact'
  /** 'server' uses the admin password login; 'artifact' lets only the claude.ai owner edit (phone demo). */
  authSource: 'server' | 'artifact'
  /** Where bundled files (public/) are served from: '/' normally, './' in the phone demo. */
  assetBase: string
}

const env = import.meta.env

export const config: AppConfig = {
  apiUrl: env.VITE_API_URL ?? '/api/data',
  dataSource: env.VITE_DATA_SOURCE === 'mock' || env.VITE_DATA_SOURCE === 'artifact' ? env.VITE_DATA_SOURCE : 'http',
  routerMode: env.VITE_ROUTER_MODE === 'memory' ? 'memory' : 'browser',
  aiSource: env.VITE_AI_SOURCE === 'artifact' ? 'artifact' : 'server',
  authSource: env.VITE_AUTH_SOURCE === 'artifact' ? 'artifact' : 'server',
  assetBase: env.BASE_URL,
}
