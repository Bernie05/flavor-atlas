import { useEffect, useState } from 'react'

/**
 * The value, but only once it has stopped changing for `delay` ms. For UI
 * timing such as what a live region announces, not for fetching data.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
