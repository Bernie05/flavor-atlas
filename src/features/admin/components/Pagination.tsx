import { Link } from 'react-router'
import { pageNumbers } from '../list'

interface PaginationProps {
  page: number
  pageCount: number
  /** The link to a page, keeping the rest of the address (filters, sort). */
  hrefFor: (page: number) => string
  /** After following a page link, e.g. to move focus to the top of the new page. */
  onNavigate?: () => void
}

const itemClass = 'inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm font-semibold tabular-nums sm:px-3'

/**
 * Page links: real links (?page=2), so a page can be bookmarked, reloaded or
 * opened in a new tab, and Back returns to the one before. Previous and Next
 * stay in place at the ends (shown, but hidden from screen readers), so the row never shifts.
 */
export function Pagination({ page, pageCount, hrefFor, onNavigate }: PaginationProps) {
  if (pageCount <= 1) return null

  const edge = (label: string, target: number, enabled: boolean) =>
    enabled ? (
      <Link to={hrefFor(target)} onClick={onNavigate} className={`${itemClass} hover:bg-surface-sunken`}>
        {label}
      </Link>
    ) : (
      // Keeps the row from shifting at either end. Hidden from screen readers: a link-less
      // "Previous" would only be read as stray text, and there is nothing to go to.
      <a aria-hidden="true" className={`${itemClass} text-ink-subtle`}>
        {label}
      </a>
    )

  return (
    // A grid keeps Previous and Next on the numbers' row even at 320px.
    <nav aria-label="Pages" className="grid grid-cols-[auto_1fr_auto] items-center gap-1">
      {edge('Previous', page - 1, page > 1)}
      <ul className="flex flex-wrap items-center justify-center gap-1">
        {pageNumbers(page, pageCount).map((n, i) =>
          n === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden className="px-1 text-ink-subtle">
              …
            </li>
          ) : (
            <li key={n}>
              <Link
                to={hrefFor(n)}
                onClick={onNavigate}
                aria-current={n === page ? 'page' : undefined}
                aria-label={`Page ${n}`}
                className={`${itemClass} ${n === page ? 'bg-ink text-canvas' : 'hover:bg-surface-sunken'}`}
              >
                {n}
              </Link>
            </li>
          ),
        )}
      </ul>
      {edge('Next', page + 1, page < pageCount)}
    </nav>
  )
}
