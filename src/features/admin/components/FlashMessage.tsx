import { useLocation, useNavigate } from 'react-router'

/** Navigation state the admin pages pass along after saving or deleting. */
export interface FlashState {
  flash?: string
}

/** Shows a one-time message passed in navigation state, e.g. "Added Japchae." */
export function FlashMessage() {
  const location = useLocation()
  const navigate = useNavigate()
  const message = (location.state as FlashState | null)?.flash
  if (!message) return null

  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-accent-ink">
      <p className="text-sm font-semibold">{message}</p>
      <button
        type="button"
        // Clear the state so the message doesn't come back on refresh or back-navigation.
        onClick={() => navigate(location.pathname + location.search, { replace: true, state: null })}
        className="min-h-10 rounded-full px-3 text-sm font-semibold hover:bg-surface/60"
      >
        Dismiss
      </button>
    </div>
  )
}
