import { useSyncExternalStore } from 'react'

/** How often the clock ticks: enough for "5 min ago" and a 10-minute undo window. */
const TICK_MS = 30_000

// One shared clock for every component that shows a time.
const listeners = new Set<() => void>()
let now = Date.now()
let timer: ReturnType<typeof setInterval> | undefined

const tick = () => {
  now = Date.now()
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    tick() // the first subscriber after a quiet spell starts from the real time
    timer = setInterval(tick, TICK_MS)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) clearInterval(timer)
  }
}

/**
 * The current time, in milliseconds, updated every 30 seconds.
 *
 * Reading `Date.now()` while rendering is impure: two renders of the same
 * props could disagree, and the linter flags it. Treating the clock as an
 * outside store (useSyncExternalStore) gives each render one stable value
 * and re-renders the component as time passes, so "just now" becomes
 * "1 min ago" and an expired Undo goes away by itself.
 */
export const useNow = () => useSyncExternalStore(subscribe, () => now, () => now)
