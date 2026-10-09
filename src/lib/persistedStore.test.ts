import { describe, expect, it } from 'vitest'
import { createPersistedStore, type KeyValueStorage } from './persistedStore'

const memoryStorage = (initial: Record<string, string> = {}) => {
  const data: Record<string, string> = { ...initial }
  const storage: KeyValueStorage = { getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) }
  return { data, storage }
}
const parseCount = (raw: string | null) => {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 0 ? n : 0
}

describe('createPersistedStore', () => {
  it('reads, writes and notifies', () => {
    const { data, storage } = memoryStorage({ count: '2' })
    const store = createPersistedStore({ storage, key: 'count', parse: parseCount })
    let calls = 0
    store.subscribe(() => calls++)
    expect(store.get()).toBe(2)
    store.set(3)
    expect(data.count).toBe('3')
    expect(calls).toBe(1)
  })

  it('falls back to the parsed default for bad or unreadable data', () => {
    expect(createPersistedStore({ storage: memoryStorage({ count: '"x"' }).storage, key: 'count', parse: parseCount }).get()).toBe(0)
    const throwing: KeyValueStorage = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    const store = createPersistedStore({ storage: throwing, key: 'count', parse: parseCount })
    store.set(5)
    expect(store.get()).toBe(5) // kept for this visit
  })

  it('only notifies on reload when the stored value really changed', () => {
    const { data, storage } = memoryStorage({ count: '1' })
    const store = createPersistedStore({ storage, key: 'count', parse: parseCount })
    let calls = 0
    store.subscribe(() => calls++)
    store.reload()
    expect(calls).toBe(0)
    data.count = '7'
    store.reload()
    expect([store.get(), calls]).toEqual([7, 1])
  })
})
