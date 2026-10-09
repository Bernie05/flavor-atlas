import { describeError } from '@/services/data'

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  /** What failed to load; most pages load recipes. */
  title?: string
}

export function ErrorState({ error, onRetry, title = "Couldn't load recipes" }: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-xl border border-danger/40 bg-surface p-6">
      <p className="font-semibold text-danger">{title}</p>
      <p className="mt-1 text-ink-muted">{describeError(error)}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:bg-surface-sunken"
        >
          Try again
        </button>
      )}
    </div>
  )
}
