import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  pendingLabel: string
  isPending: boolean
  error?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * An in-page confirmation built on the native <dialog> element, which gives
 * focus trapping, Escape to close and a backdrop for free. (window.confirm()
 * is blocked in the phone preview, and in-page dialogs look better anyway.)
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel,
  isPending,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Effects are for syncing React state with something outside React.
  // Here that's the dialog's imperative showModal()/close() API.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-2xl bg-surface p-6 text-ink ring-1 ring-line backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      <h2 id="confirm-title" className="text-2xl">
        {title}
      </h2>
      <p id="confirm-description" className="mt-2 text-ink-muted">
        {description}
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          autoFocus
          className="min-h-10 rounded-full px-4 font-semibold text-ink-muted hover:bg-surface-sunken"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="min-h-10 rounded-full bg-danger px-4 font-semibold text-on-danger disabled:opacity-60"
        >
          {isPending ? pendingLabel : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
