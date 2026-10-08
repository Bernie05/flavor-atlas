import { useSyncExternalStore } from 'react'
import { createSavedStore, SAVED_KEY, type KeyValueStorage } from './utils'

/** localStorage can throw on access (blocked site data, some private windows); then saving lasts one visit. */
function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** One store for the whole page, so every heart shows the same state. */
export const savedStore = createSavedStore(browserStorage())

// Another tab saved or removed something: show it here too.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === SAVED_KEY || event.key === null) savedStore.reload()
  })
}

/**
 * The ids of the recipes saved on this device, newest first. Client state, not
 * server state, so it lives in a small external store rather than TanStack Query.
 */
export const useSavedRecipeIds = () => useSyncExternalStore(savedStore.subscribe, savedStore.get, savedStore.get)
