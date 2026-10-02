import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { FormSkeleton } from '@/components/feedback/FormSkeleton'
import { useSession } from '../queries'
import { LoginForm } from './LoginForm'

/**
 * Layout route for admin-only pages. It decides who may ENTER: visitors go to
 * the login page and come back afterwards. It never throws someone out
 * mid-edit: if the session ends while a form is open, the form stays (with
 * everything typed) and a login box appears above it.
 *
 * This only shapes the experience. The server refuses the changes either way.
 */
export function RequireAdmin() {
  const session = useSession()
  const location = useLocation()
  // Remember that this visit started as admin. Setting state during render is
  // React's supported way to keep information from earlier renders.
  const [wasAdmin, setWasAdmin] = useState(false)
  if (session.data?.admin && !wasAdmin) setWasAdmin(true)

  if (session.isPending) return <FormSkeleton />

  const sessionEnded = !session.data?.admin && wasAdmin && session.data?.mode === 'password'

  if (!session.data?.admin && !sessionEnded) {
    if (session.data?.mode === 'owner') {
      return (
        <section className="mx-auto max-w-md py-16 text-center">
          <h1 className="text-3xl">Editing is for the owner</h1>
          <p className="mt-2 text-ink-muted">
            In this preview, only the person who shared it can add or change recipes.
          </p>
        </section>
      )
    }
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  // Same wrapper whether or not the banner shows. React keeps a component's
  // state only while it stays at the same place in the tree; if the Outlet
  // moved into a new parent here, the open form would remount and lose
  // everything typed.
  return (
    <div className="space-y-6">
      {sessionEnded && (
        <section aria-labelledby="session-ended-heading" className="rounded-2xl border border-danger/40 bg-surface p-5">
          <h2 id="session-ended-heading" className="text-xl">
            Your session ended
          </h2>
          <p className="mt-1 mb-4 text-sm text-ink-muted">Log in again, then save. Your changes below are still here.</p>
          <div className="max-w-sm">
            <LoginForm autoFocus />
          </div>
        </section>
      )}
      <Outlet />
    </div>
  )
}
