interface StatTileProps {
  label: string
  value: string
  hint?: string
}

/**
 * One headline number. The number is the chart: a sans value with
 * proportional figures, a sentence-case label, and an optional hint.
 */
export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-2 text-4xl leading-none font-semibold">{value}</p>
      {hint && <p className="mt-2 text-sm text-ink-subtle">{hint}</p>}
    </div>
  )
}
