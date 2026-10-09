import { Link } from 'react-router'
import { formatCoordinates } from '@/features/cuisines/utils'
import type { Region } from '../schema'

/**
 * "BATANGAS · 13.76°N 121.06°E": where a regional version comes from. With
 * `linked`, it opens the region's page (never inside another link, like a card).
 */
export function RegionTag({ region, className = '', linked = false }: { region: Region; className?: string; linked?: boolean }) {
  const content = (
    <>
      <span aria-hidden>📍 </span>
      {region.name} · <span className="whitespace-nowrap">{formatCoordinates(region)}</span>
    </>
  )
  return linked ? (
    <Link to={`/regions/${region.id}`} // Underlined always: touch users never see a hover, and this must read as a link.
      className={`label-mono inline-flex min-h-10 items-center tabular-nums underline decoration-current/40 underline-offset-4 hover:decoration-current ${className}`}>
      {content}
    </Link>
  ) : (
    <span className={`label-mono tabular-nums ${className}`}>{content}</span>
  )
}
