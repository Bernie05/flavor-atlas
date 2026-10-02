import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: ReactNode
  className?: string
}

/** A label, a control, and its hint or error message, wired for screen readers. */
export function Field({ label, htmlFor, error, hint, children, className = '' }: FieldProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      <FieldMessage id={`${htmlFor}-message`} error={error} hint={hint} />
    </div>
  )
}

export function FieldMessage({ id, error, hint }: { id?: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <p id={id} className="text-sm text-danger">
        {error}
      </p>
    )
  }
  return hint ? (
    <p id={id} className="text-sm text-ink-subtle">
      {hint}
    </p>
  ) : null
}

