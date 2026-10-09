import { BOUNDS, MAP_HEIGHT, MAP_WIDTH } from './landPath'

const rad = (degrees: number) => (degrees * Math.PI) / 180
const mercatorY = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + rad(latitude) / 2))

// The same Mercator fit as scripts/generate-atlas-map.mjs: the map's width spans BOUNDS west to east.
const SCALE = MAP_WIDTH / rad(BOUNDS.east - BOUNDS.west)
const OFFSET_X = -SCALE * rad(BOUNDS.west)
const OFFSET_Y = SCALE * mercatorY(BOUNDS.north)

export interface MapPoint {
  x: number
  y: number
}

/** Where a place sits on the atlas map, in the map's SVG units (0,0 = north-west corner). */
export function projectPoint({ latitude, longitude }: { latitude: number; longitude: number }): MapPoint {
  return { x: SCALE * rad(longitude) + OFFSET_X, y: OFFSET_Y - SCALE * mercatorY(latitude) }
}

/** True when a place falls inside the map, so places outside BOUNDS are left off instead of drawn at the edge. */
export const isOnMap = ({ x, y }: MapPoint) => x >= 0 && x <= MAP_WIDTH && y >= 0 && y <= MAP_HEIGHT

/** The part of the map on screen, in map units: an SVG viewBox. */
export interface MapView {
  x: number
  y: number
  width: number
  height: number
}

/** Around 47° of longitude, the width the map had when it showed only East Asia. Pin and label sizes are set for it. */
export const BASE_VIEW_WIDTH = 360

const PADDING = 36
/** Labels sit to the right of their pins, so the view leaves room for them there. */
const LABEL_ROOM = 64
/** Keep the shape close to the cards beside it: never a thin strip, never a tall column. */
const MIN_RATIO = 0.75
const MAX_RATIO = 1.1

/**
 * The view that fits every place with room to spare, so adding a cuisine
 * (Thai, Indian…) widens the map without code changes. Never narrower than
 * BASE_VIEW_WIDTH, kept to a card-like shape, and inside the drawn map.
 */
export function mapView(points: MapPoint[]): MapView {
  if (points.length === 0) return { x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT }

  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  let x = Math.min(...xs) - PADDING
  let y = Math.min(...ys) - PADDING
  let width = Math.max(...xs) + LABEL_ROOM - x
  let height = Math.max(...ys) + PADDING - y

  // Grow around the center, never shrink: every place stays in view.
  const grow = (start: number, size: number, target: number) => [start - (target - size) / 2, target] as const
  if (width < BASE_VIEW_WIDTH) [x, width] = grow(x, width, BASE_VIEW_WIDTH)
  if (height < width * MIN_RATIO) [y, height] = grow(y, height, width * MIN_RATIO)
  if (height > width * MAX_RATIO) [x, width] = grow(x, width, height / MAX_RATIO)

  // Slide back inside the drawn map, and never show more than it has.
  width = Math.min(width, MAP_WIDTH)
  height = Math.min(height, MAP_HEIGHT)
  x = Math.min(Math.max(x, 0), MAP_WIDTH - width)
  y = Math.min(Math.max(y, 0), MAP_HEIGHT - height)
  return { x, y, width, height }
}

/**
 * Where a pin's label goes: to the right, or below the pin near the view's
 * east edge, so "Japanese" neither runs off the map nor stacks onto "Korean".
 */
export const labelSide = ({ x }: MapPoint, labelWidth: number, view: Pick<MapView, 'x' | 'width'>): 'right' | 'below' =>
  x + labelWidth + 14 > view.x + view.width ? 'below' : 'right'
