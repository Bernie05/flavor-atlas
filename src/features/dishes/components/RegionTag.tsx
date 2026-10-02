import { formatCoordinates } from '@/features/cuisines/utils'
import type { Region } from '../schema'

/** "BATANGAS · 13.76°N 121.06°E": where a regional version comes from. */
export function RegionTag({ region, className = '' }: { region: Region; className?: string }) {
  return (
    <span className={`label-mono tabular-nums ${className}`}>
      <span aria-hidden>📍 </span>
      {region.name} · {formatCoordinates(region)}
    </span>
  )
}
