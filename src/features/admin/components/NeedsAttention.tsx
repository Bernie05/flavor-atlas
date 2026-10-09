import { useRef, useState } from 'react'
import { Link } from 'react-router'
import type { AttentionGroup } from '../attention'

/** Items a group shows before "Show more", so one long group doesn't push the rest off screen. */
const PREVIEW = 5

/**
 * The dashboard's to-do list: each kind of problem with its count, why it
 * matters and a link to fix each item. Native <details>, so every group
 * opens and closes with the keyboard and screen readers know its state.
 */
export function NeedsAttention({ groups }: { groups: AttentionGroup[] }) {
  const total = groups.reduce((sum, group) => sum + group.items.length, 0)

  return (
    // min-w-0: as a grid item it would otherwise grow to its content and overflow a phone.
    <section aria-labelledby="attention-heading" className="min-w-0 space-y-4">
      <div className="flex items-baseline gap-3">
        <h2 id="attention-heading" className="text-3xl">
          Needs attention
        </h2>
        {total > 0 && (
          <span className="rounded-full bg-accent-soft px-2 font-mono text-sm leading-6 text-accent-ink tabular-nums">
            {total}
          </span>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="rounded-2xl bg-surface px-4 py-6 text-ink-muted ring-1 ring-line">
          All clear: every recipe has a photo, credit, description and review, and every cuisine has recipes.
        </p>
      ) : (
        <ul className="space-y-3">
          {groups.map((group, index) => (
            <li key={group.kind}>
              <AttentionDetails group={group} open={index < 2} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function AttentionDetails({ group, open }: { group: AttentionGroup; open: boolean }) {
  const [showAll, setShowAll] = useState(false)
  // "Show more" disappears once clicked, so focus moves to the first item it revealed.
  const firstRevealed = useRef<HTMLAnchorElement>(null)
  const shown = showAll ? group.items : group.items.slice(0, PREVIEW)
  const hidden = group.items.length - shown.length

  return (
    // The two most important groups start open.
    <details open={open} className="group rounded-2xl bg-surface ring-1 ring-line">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 hover:bg-surface-sunken [&::-webkit-details-marker]:hidden">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-4 shrink-0 text-ink-subtle transition-transform group-open:rotate-90 motion-reduce:transition-none"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            {group.title} <span className="font-mono text-ink-subtle tabular-nums">({group.items.length})</span>
          </span>
          <span className="block text-sm text-ink-muted">{group.why}</span>
        </span>
      </summary>
      <ul className="divide-y divide-line border-t border-line">
        {shown.map((item, i) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate">{item.label}</span>
              {item.detail && <span className="label-mono block truncate text-ink-subtle">{item.detail}</span>}
            </span>
            <Link
              ref={i === PREVIEW ? firstRevealed : undefined}
              to={item.to}
              className="inline-flex min-h-10 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-accent hover:bg-accent-soft"
            >
              {item.action}
              <span className="sr-only"> {item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <div className="border-t border-line px-2 py-1">
          <button
            type="button"
            onClick={() => {
              setShowAll(true)
              requestAnimationFrame(() => firstRevealed.current?.focus())
            }}
            className="min-h-10 rounded-full px-3 text-sm font-semibold text-accent-ink hover:bg-surface-sunken"
          >
            Show {hidden} more<span className="sr-only"> in {group.title}</span>
          </button>
        </div>
      )}
    </details>
  )
}
