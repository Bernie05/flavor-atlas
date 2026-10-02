// Shared form styling. Control borders use line-strong to reach the 3:1
// contrast WCAG requires for input boundaries (see the flavor-atlas-ui skill).
export const inputClass =
  'w-full min-w-0 rounded-xl border border-line-strong bg-surface px-3 py-2.5 placeholder:text-ink-subtle aria-invalid:border-danger'

/**
 * Props that connect a control to its Field message and error state.
 * Only point aria-describedby at the message when one is rendered: a
 * reference to a missing id is an accessibility bug.
 */
export const describedBy = (id: string, error?: string, hasHint = false) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error || hasHint ? `${id}-message` : undefined,
})
