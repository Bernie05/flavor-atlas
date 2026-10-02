/** Placeholder cards shown while a list loads, matching the real grid's shape. */
export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
          <div className="aspect-[5/2] animate-pulse sm:aspect-[16/10] bg-surface-sunken motion-reduce:animate-none" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface-sunken motion-reduce:animate-none" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-surface-sunken motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  )
}
