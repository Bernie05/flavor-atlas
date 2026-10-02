export function FormSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading form" className="space-y-4">
      <div className="h-48 animate-pulse rounded-3xl bg-surface-sunken motion-reduce:animate-none" />
      <div className="h-32 animate-pulse rounded-2xl bg-surface-sunken motion-reduce:animate-none" />
    </div>
  )
}
