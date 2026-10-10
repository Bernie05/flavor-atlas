import { Link } from 'react-router'
import { useIsAdmin } from '@/features/auth/queries'

interface AdminEditLinkProps {
  to: string
  /** What it edits, for screen readers: "Edit" alone is ambiguous out of context. */
  label: string
}

/**
 * A shortcut from a public page to its admin form, shown only to the admin.
 * It's a link, not a control: nothing is written from the public page, and
 * the admin page (and the server) check access again on their own.
 * A solid fill keeps it readable on a tinted header and, darker, over a photo.
 */
export function AdminEditLink({ to, label }: AdminEditLinkProps) {
  if (!useIsAdmin()) return null
  return (
    <Link
      to={to}
      className="label-mono inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-ink-muted hover:bg-surface-sunken hover:text-ink in-[.on-photo]:bg-canvas/75 in-[.on-photo]:text-ink"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      </svg>
      Edit<span className="sr-only"> {label}</span>
    </Link>
  )
}
