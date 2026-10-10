import { useEffect, useRef, type ReactNode } from 'react'

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
  /**
   * False when the action can't happen yet (a cuisine that still has recipes):
   * the dialog explains why, shows `children` (e.g. a link to fix it) and offers only Close.
   */
  canConfirm?: boolean
  children?: ReactNode
  /** 'primary' for actions that aren't destructive (moving recipes); 'danger' by default. */
  tone?: 'danger' | 'primary'
  /** Confirm stays visible and focusable but does nothing yet (e.g. until a choice is made). */
  confirmBlocked?: boolean
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
  canConfirm = true,
  children,
  tone = 'danger',
  confirmBlocked = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Effects are for syncing React state with something outside React.
  // Here that's the dialog's imperative showModal()/close() API.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // The safe choice starts focused. showModal() would focus the first focusable
      // element, which is a link when the dialog has one (children), not Cancel.
      cancelRef.current?.focus()
    }
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
      {children && <div className="mt-3">{children}</div>}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          ref={cancelRef}
          onClick={onCancel}
          className="min-h-10 rounded-full px-4 font-semibold text-ink-muted hover:bg-surface-sunken"
        >
          {canConfirm ? 'Cancel' : 'Close'}
        </button>
        {canConfirm && (
          <button
            type="button"
            onClick={() => !confirmBlocked && onConfirm()}
            aria-disabled={confirmBlocked || undefined}
            disabled={isPending}
            className={`min-h-10 rounded-full px-4 font-semibold disabled:opacity-60 aria-disabled:opacity-60 ${
              tone === 'danger' ? 'bg-danger text-on-danger' : 'bg-ink text-canvas hover:bg-accent'
            }`}
          >
            {isPending ? pendingLabel : confirmLabel}
          </button>
        )}
      </div>
    </dialog>
  )
}
