import { useSyncExternalStore } from 'react'
import { browserStorage, syncAcrossTabs } from '@/lib/persistedStore'
import { createSavedStore, SAVED_KEY } from './utils'

/** One store for the whole page, so every heart shows the same state. */
export const savedStore = createSavedStore(browserStorage())

// Another tab saved or removed something: show it here too.
syncAcrossTabs(savedStore, SAVED_KEY)

/**
 * The ids of the recipes saved on this device, newest first. Client state, not
 * server state, so it lives in a small external store rather than TanStack Query.
 */
export const useSavedRecipeIds = () => useSyncExternalStore(savedStore.subscribe, savedStore.get, savedStore.get)
