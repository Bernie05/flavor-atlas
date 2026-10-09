import { useSyncExternalStore } from 'react'
import { browserStorage, createPersistedStore, syncAcrossTabs } from '@/lib/persistedStore'
import { parseShoppingState, toggleChecked } from './utils'

const SHOPPING_KEY = 'flavor-atlas:shopping-list'

/** The shopping list's settings for this browser: servings, left-out recipes, ticked lines. */
const shoppingStore = createPersistedStore({ storage: browserStorage(), key: SHOPPING_KEY, parse: parseShoppingState })
syncAcrossTabs(shoppingStore, SHOPPING_KEY)

const update = (change: (state: ReturnType<typeof shoppingStore.get>) => ReturnType<typeof shoppingStore.get>) =>
  shoppingStore.set(change(shoppingStore.get()))

export const shoppingActions = {
  setServings: (recipeId: string, people: number) =>
    update((state) => ({ ...state, servings: { ...state.servings, [recipeId]: people } })),
  toggleIncluded: (recipeId: string) =>
    update((state) => ({
      ...state,
      excluded: state.excluded.includes(recipeId) ? state.excluded.filter((id) => id !== recipeId) : [...state.excluded, recipeId],
    })),
  toggleChecked: (key: string) => update((state) => toggleChecked(state, key)),
  clearChecked: () => update((state) => ({ ...state, checked: [] })),
}

export const useShoppingState = () => useSyncExternalStore(shoppingStore.subscribe, shoppingStore.get, shoppingStore.get)
