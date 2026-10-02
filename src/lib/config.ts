// Centralize environment access so the rest of the app never reads
// import.meta.env directly. Swapping environments means changing one file.

interface AppConfig {
  /** Base URL of the json-server REST API. */
  apiUrl: string
  /** 'http' talks to json-server; 'mock' uses in-memory seed data (phone demo). */
  dataSource: 'http' | 'mock'
  /** 'memory' keeps routes out of the URL, for hosts that own the URL (phone demo). */
  routerMode: 'browser' | 'memory'
  /** 'server' calls /api/ai; 'artifact' asks Claude through the claude.ai viewer (phone demo). */
  aiSource: 'server' | 'artifact'
}

const env = import.meta.env

export const config: AppConfig = {
  apiUrl: env.VITE_API_URL ?? 'http://localhost:3001',
  dataSource: env.VITE_DATA_SOURCE === 'mock' ? 'mock' : 'http',
  routerMode: env.VITE_ROUTER_MODE === 'memory' ? 'memory' : 'browser',
  aiSource: env.VITE_AI_SOURCE === 'artifact' ? 'artifact' : 'server',
}
