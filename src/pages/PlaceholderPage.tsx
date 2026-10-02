// Temporary page for routes that later phases will build.
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="rounded-xl border border-dashed border-line bg-surface p-8 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-ink-muted">Coming in the next phase.</p>
    </section>
  )
}
