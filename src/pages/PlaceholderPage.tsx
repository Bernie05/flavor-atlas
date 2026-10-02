import { useParams } from 'react-router'

// Temporary page used while each feature is built phase by phase.
export function PlaceholderPage({ title }: { title: string }) {
  const params = useParams()
  const hasParams = Object.keys(params).length > 0

  return (
    <section className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {hasParams && (
        <p className="mt-2 font-mono text-sm text-stone-500">{JSON.stringify(params)}</p>
      )}
      <p className="mt-2 text-stone-500">Coming in the next phase.</p>
    </section>
  )
}
