import { useId, type ReactNode } from 'react'

/*
 * Each cuisine's "tablecloth": a traditional pattern from that food culture,
 * drawn in the cuisine's tint. Inline SVG (not a background image) so the
 * fills can use theme tokens and follow light and dark mode.
 */

// Seigaiha ("blue ocean waves"): rows of concentric arcs, each row in front
// of the one above. The tile repeats every 40×20; every scale that reaches
// into the tile is drawn, top row first, so the overlaps line up at the seams.
const SEIGAIHA_UNITS = [-20, -10, 0, 10, 20, 30].flatMap((y, row) =>
  [-20, 0, 20, 40, 60].filter((x) => (x / 20 + row) % 2 === 0).map((x) => ({ x, y })),
)

// Jogakbo: a patchwork bojagi, scraps of cloth stitched into a square.
const PATCHES = [
  { x: 0, y: 0, w: 26, h: 18, o: 0.18 },
  { x: 26, y: 0, w: 34, h: 30, o: 0.32 },
  { x: 0, y: 18, w: 14, h: 42, o: 0.42 },
  { x: 14, y: 18, w: 12, h: 22, o: 0.12 },
  { x: 14, y: 40, w: 30, h: 20, o: 0.26 },
  { x: 26, y: 30, w: 18, h: 10, o: 0.5 },
  { x: 44, y: 30, w: 16, h: 30, o: 0.16 },
]

function Pattern({ cuisineId }: { cuisineId: string }) {
  switch (cuisineId) {
    case 'japanese':
      return (
        <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.55">
          {SEIGAIHA_UNITS.map(({ x, y }) => (
            <g key={`${x},${y}`}>
              <circle cx={x} cy={y} r="20" fill="var(--tint-soft)" />
              {[18, 14, 10, 6].map((r) => (
                <circle key={r} cx={x} cy={y} r={r} />
              ))}
            </g>
          ))}
        </g>
      )
    case 'korean':
      return (
        <g fill="currentColor" stroke="var(--tint-soft)" strokeWidth="1.5">
          {PATCHES.map((p) => (
            <rect key={`${p.x},${p.y}`} x={p.x} y={p.y} width={p.w} height={p.h} fillOpacity={p.o} />
          ))}
        </g>
      )
    case 'chinese':
      // Huiwen: the squared spiral fret of lattice windows and porcelain rims.
      return (
        <path
          d="M2 2H22V22H6V6H18V18H10V10H14"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.32"
          strokeWidth="1.3"
          strokeLinecap="square"
        />
      )
    case 'filipino':
      // Banig: a mat woven from strips of buri palm, read as a diagonal check.
      return (
        <g fill="currentColor">
          <rect width="8" height="8" fillOpacity="0.3" />
          <rect x="8" y="8" width="8" height="8" fillOpacity="0.3" />
          <rect x="8" width="8" height="8" fillOpacity="0.1" />
          <rect y="8" width="8" height="8" fillOpacity="0.1" />
          <path d="M0 4H16M4 0V16M12 0V16M0 12H16" stroke="var(--tint-soft)" strokeWidth="0.6" strokeOpacity="0.7" />
        </g>
      )
    default:
      return null
  }
}

const TILES: Record<string, { width: number; height: number; transform?: string }> = {
  japanese: { width: 40, height: 20 },
  korean: { width: 60, height: 60 },
  chinese: { width: 24, height: 24, transform: 'scale(1.4)' },
  filipino: { width: 16, height: 16, transform: 'rotate(45)' },
}

interface CuisineClothProps {
  cuisineId: string | undefined
  className?: string
  children?: ReactNode
}

/**
 * The picture area for a recipe without a photo: the cuisine's pattern, a
 * soft spotlight in the middle, and the dish (children) set on top.
 * Unknown cuisines fall back to the atlas dots. Expects cuisineTint() above.
 */
export function CuisineCloth({ cuisineId = '', className = '', children }: CuisineClothProps) {
  const id = useId()
  const tile = TILES[cuisineId]

  return (
    <div
      className={`relative isolate grid max-w-full place-items-center overflow-hidden ${
        tile ? 'bg-tint-soft' : 'atlas-dots'
      } ${className}`}
    >
      {tile && (
        <svg aria-hidden className="absolute inset-0 -z-10 size-full text-tint">
          <defs>
            <pattern
              id={id}
              width={tile.width}
              height={tile.height}
              patternUnits="userSpaceOnUse"
              patternTransform={tile.transform}
            >
              <Pattern cuisineId={cuisineId} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${CSS.escape(id)})`} />
        </svg>
      )}
      {/* The spotlight: the pattern fades out behind the dish. */}
      <div aria-hidden className="cloth-spotlight absolute inset-0 -z-10" />
      {children}
    </div>
  )
}
