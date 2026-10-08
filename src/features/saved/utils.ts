import { MAX_SAVED, savedRecipeIdsSchema, type SavedRecipeIds } from './schema'

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

/** The part of the Web Storage API the store needs, so tests can pass an in-memory one. */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

/**
 * A tiny external store for the saved list, shaped for React's
 * useSyncExternalStore: `get` returns the same array until the list changes,
 * and `subscribe` tells every listener (every heart on the page) when it does.
 * `storage` may be null (blocked storage, private windows): saving then lasts
 * for this visit only.
 */
export function createSavedStore(storage: KeyValueStorage | null) {
  const read = () => {
    try {
      return parseSaved(storage?.getItem(SAVED_KEY) ?? null)
    } catch {
      return []
    }
  }
  let ids = read()
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((listener) => listener())

  return {
    get: () => ids,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    toggle(id: string) {
      ids = toggleSaved(ids, id)
      try {
        storage?.setItem(SAVED_KEY, JSON.stringify(ids))
      } catch {
        // Quota or blocked storage: keep the change for this visit.
      }
      notify()
    },
    /** Re-read storage after another tab changed it. */
    reload() {
      const next = read()
      if (next.join() !== ids.join()) {
        ids = next
        notify()
      }
    },
  }
}
