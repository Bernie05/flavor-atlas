// Centralize environment access so the rest of the app never reads
// import.meta.env directly. Swapping environments means changing one file.
export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
} as const
