import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { NotFoundPage } from './NotFoundPage'

/** Catches errors thrown while rendering a route, so one bug doesn't blank the app. */
export function RouteErrorPage() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-ink-muted">An unexpected error stopped this page from loading.</p>
      <Link to="/" className="mt-6 inline-block font-medium text-accent hover:text-accent-hover">
        Back to all cuisines
      </Link>
    </section>
  )
}
