/** The part of the Web Storage API a store needs, so tests can pass an in-memory one. */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

export interface PersistedStore<T> {
  /** The current value: the same object until it changes, as useSyncExternalStore requires. */
  get(): T
  set(next: T): void
  subscribe(listener: () => void): () => void
  /** Re-read storage, e.g. after another tab changed it. */
  reload(): void
}

interface PersistedStoreOptions<T> {
  storage: KeyValueStorage | null
  key: string
  /**
   * Turn the stored string (or null) into a value. Storage is untrusted input:
   * this must validate, and return a safe default for anything it can't read.
   */
  parse: (raw: string | null) => T
}

/**
 * A value kept in the visitor's browser that React can subscribe to with
 * useSyncExternalStore. A null or throwing storage (blocked site data, some
 * private windows) still works: the value then lasts for this visit only.
 */
export function createPersistedStore<T>({ storage, key, parse }: PersistedStoreOptions<T>): PersistedStore<T> {
  const read = (): T => {
    try {
      return parse(storage?.getItem(key) ?? null)
    } catch {
      return parse(null)
    }
  }
  let value = read()
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((listener) => listener())

  return {
    get: () => value,
    set(next) {
      value = next
      try {
        storage?.setItem(key, JSON.stringify(next))
      } catch {
        // Quota or blocked storage: keep the change for this visit.
      }
      notify()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    reload() {
      const next = read()
      if (JSON.stringify(next) !== JSON.stringify(value)) {
        value = next
        notify()
      }
    },
  }
}

/** localStorage, or null where touching it throws. */
export function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** Keep a store in step with other tabs: the browser fires `storage` there when one tab writes. */
export function syncAcrossTabs(store: Pick<PersistedStore<unknown>, 'reload'>, key: string) {
  if (typeof window === 'undefined') return
  window.addEventListener('storage', (event) => {
    if (event.key === key || event.key === null) store.reload()
  })
}
