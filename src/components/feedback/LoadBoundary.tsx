import { Component, type ReactNode } from 'react'

/**
 * Catches a part of the page that failed to load (a lazy chunk on a flaky
 * connection, or an old tab after a deploy removed the file) and offers a
 * reload, so the rest of the page stays. A reload, not a retry: browsers
 * remember a failed module download for the life of the page, so asking for
 * the same file again fails at once. Error boundaries are still class
 * components: React has no hook for them.
 */
export class LoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="space-y-3 rounded-2xl border border-danger/40 bg-surface p-5">
        <p className="font-semibold text-danger">Couldn't load this part of the page</p>
        <p className="text-ink-muted">Check your connection, then reload the page.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-10 rounded-full border border-line-strong px-4 text-sm font-semibold hover:bg-surface-sunken"
        >
          Reload the page
        </button>
      </div>
    )
  }
}
