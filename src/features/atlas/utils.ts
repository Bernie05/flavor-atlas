import { BOUNDS, MAP_HEIGHT, MAP_WIDTH } from './mapBounds'

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

/**
 * Pin and label sizes in map units at BASE_VIEW_WIDTH. A wider view multiplies
 * them by its zoom (pinScale), so they stay the same size on screen.
 */
export const PIN = {
  /** Invisible tap target: 41px on a 320px phone. */
  hitRadius: 26,
  radius: 8,
  labelSize: 13,
  /** Gap from the pin to a label on its right. */
  labelGap: 13,
} as const

/** How much bigger pins are drawn in this view than in a BASE_VIEW_WIDTH one. */
export const pinScale = (view: Pick<MapView, 'width'>) => view.width / BASE_VIEW_WIDTH

/** Roughly how wide an uppercase, letter-spaced label is, in map units at BASE_VIEW_WIDTH. */
export const labelWidth = (text: string) => text.length * PIN.labelSize * 0.7

const PADDING = 36
/** Labels sit to the right of their pins: the gap plus a label as long as "JAPANESE". */
const LABEL_ROOM = PIN.labelGap + labelWidth('Japanese')
/** Keep the shape close to the cards beside it: never a thin strip, never a tall column. */
const MIN_RATIO = 0.75
const MAX_RATIO = 1.1

function fit(points: MapPoint[], padding: number): MapView {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  let x = Math.min(...xs) - padding
  let y = Math.min(...ys) - padding
  let width = Math.max(...xs) + Math.max(LABEL_ROOM, padding) - x
  let height = Math.max(...ys) + padding - y

  // Extra width goes to the west: the labels already pad the east side.
  if (width < BASE_VIEW_WIDTH) [x, width] = [x - (BASE_VIEW_WIDTH - width), BASE_VIEW_WIDTH]
  // Extra height is shared between north and south; every place stays in view.
  if (height < width * MIN_RATIO) [y, height] = [y - (width * MIN_RATIO - height) / 2, width * MIN_RATIO]
  if (height > width * MAX_RATIO) [x, width] = [x - (height / MAX_RATIO - width) / 2, height / MAX_RATIO]

  // Slide back inside the drawn map, and never show more than it has.
  width = Math.min(width, MAP_WIDTH)
  height = Math.min(height, MAP_HEIGHT)
  x = Math.min(Math.max(x, 0), MAP_WIDTH - width)
  y = Math.min(Math.max(y, 0), MAP_HEIGHT - height)
  return { x, y, width, height }
}

/**
 * The view that fits every place with room to spare, so adding a cuisine
 * (Thai, Indian…) widens the map without code changes. Never narrower than
 * BASE_VIEW_WIDTH, kept to a card-like shape, and inside the drawn map.
 * A wider view draws bigger pins, so the padding is checked against the
 * final zoom: a pin's tap target is never cut off at the edge.
 */
export function mapView(points: MapPoint[]): MapView {
  if (points.length === 0) return { x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT }
  const first = fit(points, PADDING)
  const needed = PIN.hitRadius * pinScale(first) + 4
  return needed > PADDING ? fit(points, needed) : first
}

/** The view for a set of places given in degrees, leaving out any the map doesn't draw. */
export const placesView = (places: { latitude: number; longitude: number }[]) =>
  mapView(places.map((place) => projectPoint(place)).filter(isOnMap))

/**
 * Where a pin's label goes: to its right, or below the pin when the right
 * would run off the view or cover another pin (so tapping "Chinese" never
 * opens Korean). `others` are the other pins.
 */
export function labelSide(point: MapPoint, text: string, view: MapView, others: MapPoint[] = []): 'right' | 'below' {
  const k = pinScale(view)
  const left = point.x + PIN.labelGap * k
  const right = left + labelWidth(text) * k
  const top = point.y - PIN.labelSize * k
  const bottom = point.y + PIN.labelSize * k * 0.5
  if (right > view.x + view.width) return 'below'
  const reach = PIN.radius * k
  const covers = others.some(
    (other) => other.x + reach > left && other.x - reach < right && other.y + reach > top && other.y - reach < bottom,
  )
  return covers ? 'below' : 'right'
}
