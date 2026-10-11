import { describe, expect, it } from 'vitest'
import { UNDO_WINDOW_MS } from '@/features/recipes/move'
import type { Activity } from './schema'
import { activityOverflow, entryForUndo, sortActivity, timeAgo, undoAvailable } from './utils'

const NOW = Date.parse('2026-10-11T12:00:00.000Z')
const entry = (id: string, at: string, extra: Partial<Activity> = {}): Activity => ({ id, at, kind: 'recipe', summary: `Change ${id}`, ...extra })
const undo = { kind: 'move' as const, at: NOW - 60_000, recipes: [] }

describe('sortActivity and activityOverflow', () => {
  const entries = [entry('a', '2026-10-11T10:00:00Z'), entry('c', '2026-10-11T11:00:00Z'), entry('b', '2026-10-11T10:30:00Z')]

  it('puts the newest first', () => {
    expect(sortActivity(entries).map((e) => e.id)).toEqual(['c', 'b', 'a'])
  })

  it('puts the later-stored first when two share a timestamp', () => {
    const same = '2026-10-11T10:00:00.000Z'
    expect(sortActivity([entry('first', same), entry('second', same)]).map((e) => e.id)).toEqual(['second', 'first'])
    expect(activityOverflow([entry('first', same), entry('second', same)], 1).map((e) => e.id)).toEqual(['first'])
  })

  it('names the oldest entries beyond the limit', () => {
    expect(activityOverflow(entries, 2).map((e) => e.id)).toEqual(['a'])
    expect(activityOverflow(entries, 5)).toEqual([])
  })
})

describe('undoAvailable', () => {
  it('offers undo for a recent move or merge that was not undone', () => {
    expect(undoAvailable(entry('a', '2026-10-11T11:59:00Z', { kind: 'move', undo }), NOW)).toBe(true)
  })

  it('not once undone, not after the window, not for other changes', () => {
    expect(undoAvailable(entry('a', '2026-10-11T11:59:00Z', { undo, undoneAt: '2026-10-11T11:59:30Z' }), NOW)).toBe(false)
    expect(undoAvailable(entry('a', '2026-10-11T11:59:00Z', { undo }), NOW + UNDO_WINDOW_MS)).toBe(false)
    expect(undoAvailable(entry('a', '2026-10-11T11:59:00Z'), NOW)).toBe(false)
  })
})

describe('entryForUndo', () => {
  it('finds the entry that holds this undo, if it is still open', () => {
    const open = entry('a', '2026-10-11T11:59:00Z', { undo })
    expect(entryForUndo([entry('b', '2026-10-11T11:00:00Z'), open], undo.at)).toBe(open)
    expect(entryForUndo([{ ...open, undoneAt: '2026-10-11T11:59:30Z' }], undo.at)).toBeUndefined()
  })
})

describe('timeAgo', () => {
  it('reads like a person would say it', () => {
    expect(timeAgo('2026-10-11T11:59:30Z', NOW)).toBe('just now')
    expect(timeAgo('2026-10-11T11:55:00Z', NOW)).toBe('5 min ago')
    expect(timeAgo('2026-10-11T09:00:00Z', NOW)).toBe('3 h ago')
    expect(timeAgo('2026-10-10T09:00:00Z', NOW)).toBe('yesterday')
    expect(timeAgo('2026-10-07T12:00:00Z', NOW)).toBe('4 days ago')
    expect(timeAgo('2026-09-01T12:00:00Z', NOW)).toMatch(/Sep|1/)
  })

  it('treats a clock slightly behind the server as just now', () => {
    expect(timeAgo('2026-10-11T12:00:05Z', NOW)).toBe('just now')
  })
})
