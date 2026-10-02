/** The Flavor Atlas mark: a plate seen from above with a compass needle. */
export function AtlasMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <circle cx="16" cy="16" r="14" fill="var(--plate)" stroke="var(--line)" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="var(--plate-rim)" strokeWidth="1.5" />
      <path d="M16 5 L19 16 L16 27 L13 16 Z" fill="var(--accent)" />
      <path d="M16 16 L19 16 L16 27 L13 16 Z" fill="var(--ink-subtle)" />
    </svg>
  )
}
