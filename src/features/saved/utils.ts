import { createPersistedStore, type KeyValueStorage } from '@/lib/persistedStore'
import { MAX_SAVED, savedRecipeIdsSchema, type SavedRecipeIds } from './schema'

export type { KeyValueStorage }

/** The key the list is stored under in localStorage. */
export const SAVED_KEY = 'flavor-atlas:saved-recipes'

/** Read a stored list. Anything missing, malformed or tampered with reads as an empty list. */
export function parseSaved(raw: string | null): SavedRecipeIds {
  if (!raw) return []
  try {
    const parsed = savedRecipeIdsSchema.safeParse(JSON.parse(raw))
    return parsed.success ? [...new Set(parsed.data)] : []
  } catch {
    return []
  }
}

/** Save a recipe (newest first) or, if it's already saved, remove it. Returns a new list. */
export function toggleSaved(ids: SavedRecipeIds, id: string): SavedRecipeIds {
  return ids.includes(id) ? ids.filter((saved) => saved !== id) : [id, ...ids].slice(0, MAX_SAVED)
}

/** The saved recipes that still exist, in saved order: a deleted recipe simply drops out. */
export function pickSaved<T extends { id: string }>(ids: SavedRecipeIds, recipes: T[]): T[] {
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]))
  return ids.flatMap((id) => byId.get(id) ?? [])
}

/**
 * The saved list as a store every heart can subscribe to (see
 * createPersistedStore), plus the one action it needs.
 */
export function createSavedStore(storage: KeyValueStorage | null) {
  const store = createPersistedStore({ storage, key: SAVED_KEY, parse: parseSaved })
  return { ...store, toggle: (id: string) => store.set(toggleSaved(store.get(), id)) }
}
