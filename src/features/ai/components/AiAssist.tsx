import type { ReactNode } from 'react'
import { AiError } from '@/services/ai'
import type { AiDraft, AiSuggestion, AiTask } from '../schema'
import { useAiAvailable, useAiSuggestion } from '../useAiSuggestion'

interface AiAssistProps<T extends AiTask> {
  task: T
  /** Button text, e.g. "Write a description". */
  label: string
  /** Read the form at click time, so the AI sees the latest draft. */
  getDraft: () => AiDraft
  renderSuggestion: (suggestion: AiSuggestion<T>) => ReactNode
  onApply: (suggestion: AiSuggestion<T>) => void
  /** Text on the accept button, e.g. "Replace ingredients". */
  applyLabel?: string
}

/**
 * The AI flow for one field: ask, review, then accept or discard.
 * The suggestion never changes the form until the cook chooses "Use this":
 * the AI drafts, the person decides.
 */
export function AiAssist<T extends AiTask>({
  task,
  label,
  getDraft,
  renderSuggestion,
  onApply,
  applyLabel = 'Use this',
}: AiAssistProps<T>) {
  const available = useAiAvailable()
  const suggestion = useAiSuggestion(task)

  // Hide entirely where AI can't run (or the viewer declined it).
  const hidden =
    available === false || (suggestion.error instanceof AiError && suggestion.error.code === 'unavailable')
  if (hidden) return null

  const ask = () => suggestion.mutate(getDraft())
  // Captured once so callbacks below see a definite value (narrowing doesn't reach closures).
  const result = suggestion.data
  const error =
    suggestion.error instanceof AiError && suggestion.error.code !== 'cancelled' ? suggestion.error : null

  return (
    <div className="space-y-2">
      {suggestion.isPending ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="label-mono animate-pulse text-accent-ink motion-reduce:animate-none">Thinking…</span>
          <button
            type="button"
            onClick={suggestion.stop}
            className="min-h-10 rounded-full px-3 text-sm font-semibold text-ink-muted hover:bg-surface-sunken"
          >
            Stop
          </button>
        </div>
      ) : (
        !result && (
          <button
            type="button"
            onClick={ask}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent-soft px-4 text-sm font-semibold text-accent-ink hover:ring-1 hover:ring-accent"
          >
            <span aria-hidden>✨</span>
            {label}
          </button>
        )
      )}

      {/* Announces errors and new suggestions to screen readers. */}
      <div aria-live="polite">
        {error && <p className="text-sm text-danger">{error.message}</p>}

        {result && (
          <div className="space-y-3 rounded-xl border border-dashed border-accent bg-surface p-4">
            <p className="label-mono text-accent-ink">AI suggestion · review before using</p>
            <div className="text-sm">{renderSuggestion(result)}</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  onApply(result)
                  suggestion.reset()
                }}
                className="min-h-10 rounded-full bg-ink px-4 text-sm font-semibold text-canvas hover:bg-accent"
              >
                {applyLabel}
              </button>
              <button
                type="button"
                onClick={ask}
                className="min-h-10 rounded-full border border-line-strong px-4 text-sm font-semibold hover:bg-surface-sunken"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => suggestion.reset()}
                className="min-h-10 rounded-full px-4 text-sm font-semibold text-ink-muted hover:bg-surface-sunken"
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
