import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="py-16 text-center">
      <p className="text-5xl" aria-hidden>
        🍽️
      </p>
      <h1 className="mt-4 text-2xl font-semibold">This plate is empty</h1>
      <p className="mt-2 text-stone-500">We couldn't find the page you were looking for.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-full bg-brand-500 px-5 py-2 font-medium text-white hover:bg-brand-600"
      >
        Back to explore
      </Link>
    </section>
  )
}
