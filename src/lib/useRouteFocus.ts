import { useEffect, useRef, type RefObject } from 'react'
import { useLocation, useNavigationType } from 'react-router'

/** How long to wait for a lazy page to draw its heading before giving up. */
const WAIT_MS = 5000

/**
 * Moves focus to the new page's <h1> after a navigation, as a full page load
 * would reset it. Without this, a screen reader stays on the link that was
 * pressed (or on <body>, if it unmounted) and announces nothing.
 *
 * Only a new pathname counts: filters and search change the query string and
 * keep focus where the person is typing. A page that focuses a field itself
 * (autofocus) keeps it. Lazy pages draw a skeleton first, so it waits for the
 * heading to appear.
 */
export function useRouteFocus(mainRef: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  const previous = useRef<string | null>(null)

  useEffect(() => {
    const before = previous.current
    const changed = before !== null && before !== pathname
    // A layout mounted by a link or redirect (the login page to the admin) counts too; the
    // first page of a visit ('POP') keeps the browser's own focus, the top of the document.
    const entered = before === null && navigationType !== 'POP'
    previous.current = pathname
    const main = mainRef.current
    if (!main || (!changed && !entered)) return

    let done = false
    const focusHeading = () => {
      const active = document.activeElement
      // A page that focused a field itself (autofocus) keeps it.
      if (active && main.contains(active) && active.matches('input, select, textarea')) return (done = true)
      const heading = main.querySelector('h1')
      if (!heading) return false
      if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1
      // ScrollRestoration owns the scroll position (top for a new page, restored on Back).
      heading.focus({ preventScroll: true })
      return (done = true)
    }
    if (focusHeading()) return

    // A lazy page shows a skeleton first: wait for its heading.
    const observer = new MutationObserver(() => focusHeading() && observer.disconnect())
    observer.observe(main, { childList: true, subtree: true })
    const timer = setTimeout(() => observer.disconnect(), WAIT_MS)
    return () => {
      observer.disconnect()
      clearTimeout(timer)
      // Cleaned up while still waiting (StrictMode runs effects twice in development):
      // forget this pathname, so the next run still sees the change and waits again.
      if (!done) previous.current = before
    }
  }, [pathname, navigationType, mainRef])
}
