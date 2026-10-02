import { Link } from 'react-router'

interface NotFoundPageProps {
  message?: string
}

export function NotFoundPage({
  message = "We couldn't find the page you were looking for.",
}: NotFoundPageProps) {
  return (
    <section className="py-16 text-center">
      <title>Not found · Flavor Atlas</title>
      <p className="text-5xl" aria-hidden>
        🍽️
      </p>
      <h1 className="mt-4 text-3xl">This plate is empty</h1>
      <p className="mt-2 text-ink-muted">{message}</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-full bg-ink px-5 py-2 font-semibold text-canvas hover:bg-accent"
      >
        Back to all cuisines
      </Link>
    </section>
  )
}
