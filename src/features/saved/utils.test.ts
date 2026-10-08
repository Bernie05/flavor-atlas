import { describe, expect, it } from 'vitest'
import { MAX_SAVED } from './schema'
import { createSavedStore, parseSaved, pickSaved, SAVED_KEY, toggleSaved, type KeyValueStorage } from './utils'

const memoryStorage = (initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } => {
  const data = { ...initial }
  return { data, getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) }
}

describe('parseSaved', () => {
  it('reads a stored list and drops duplicates', () => {
    expect(parseSaved('["1","5","1"]')).toEqual(['1', '5'])
  })

  it('treats missing, broken or tampered data as an empty list', () => {
    expect(parseSaved(null)).toEqual([])
    expect(parseSaved('not json')).toEqual([])
    expect(parseSaved('{"id":"1"}')).toEqual([])
    expect(parseSaved('[1, 2]')).toEqual([])
    expect(parseSaved(JSON.stringify(Array.from({ length: MAX_SAVED + 1 }, (_, i) => String(i))))).toEqual([])
  })
})

describe('toggleSaved', () => {
  it('adds newest first and removes on a second toggle', () => {
    expect(toggleSaved(['1'], '5')).toEqual(['5', '1'])
    expect(toggleSaved(['5', '1'], '5')).toEqual(['1'])
  })

  it('keeps at most MAX_SAVED, dropping the oldest', () => {
    const full = Array.from({ length: MAX_SAVED }, (_, i) => String(i))
    const next = toggleSaved(full, 'new')
    expect(next).toHaveLength(MAX_SAVED)
    expect(next[0]).toBe('new')
    expect(next).not.toContain(String(MAX_SAVED - 1))
  })
})

describe('pickSaved', () => {
  it('returns recipes in saved order and skips ones that no longer exist', () => {
    const recipes = [{ id: '1' }, { id: '2' }, { id: '3' }]
    expect(pickSaved(['3', 'gone', '1'], recipes)).toEqual([{ id: '3' }, { id: '1' }])
  })
})

describe('createSavedStore', () => {
  it('persists toggles and notifies subscribers', () => {
    const storage = memoryStorage()
    const store = createSavedStore(storage)
    let calls = 0
    store.subscribe(() => calls++)
    store.toggle('4')
    expect(store.get()).toEqual(['4'])
    expect(JSON.parse(storage.data[SAVED_KEY]!)).toEqual(['4'])
    expect(calls).toBe(1)
  })

  it('returns the same array until the list changes (what useSyncExternalStore needs)', () => {
    const store = createSavedStore(memoryStorage({ [SAVED_KEY]: '["1"]' }))
    expect(store.get()).toBe(store.get())
    store.reload() // nothing changed in storage
    expect(store.get()).toEqual(['1'])
  })

  it('picks up changes made in another tab', () => {
    const storage = memoryStorage()
    const store = createSavedStore(storage)
    let calls = 0
    store.subscribe(() => calls++)
    storage.data[SAVED_KEY] = '["9"]'
    store.reload()
    expect(store.get()).toEqual(['9'])
    expect(calls).toBe(1)
  })

  it('still works for this visit when storage is blocked', () => {
    const throwing: KeyValueStorage = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    const store = createSavedStore(throwing)
    store.toggle('2')
    expect(store.get()).toEqual(['2'])
    expect(createSavedStore(null).get()).toEqual([])
  })
})
