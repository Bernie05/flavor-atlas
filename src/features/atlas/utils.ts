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

/** The inverse of projectPoint: the latitude and longitude under a point on the map (for picking a place by clicking). */
export function unprojectPoint({ x, y }: MapPoint): { latitude: number; longitude: number } {
  const longitude = ((x - OFFSET_X) / SCALE) * (180 / Math.PI)
  // Inverse Mercator: y = ln(tan(π/4 + φ/2))  ⇒  φ = 2·atan(e^y) − π/2
  const latitude = (2 * Math.atan(Math.exp((OFFSET_Y - y) / SCALE)) - Math.PI / 2) * (180 / Math.PI)
  return { latitude, longitude }
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
  /**
   * A regional dot's tap target: 24px across on a 320px phone, the WCAG 2.5.8
   * minimum for dense targets (pins keep 41px+). Dots only become tappable
   * when these circles overlap nothing else, which is that rule's spacing test.
   */
  dotHitRadius: 15,
} as const

/** How much bigger pins are drawn in this view than in a BASE_VIEW_WIDTH one. */
export const pinScale = (view: Pick<MapView, 'width'>) => view.width / BASE_VIEW_WIDTH

/** Roughly how wide an uppercase, letter-spaced label is, in map units at BASE_VIEW_WIDTH. */
export const labelWidth = (text: string) => text.length * PIN.labelSize * 0.7

const PADDING = 36
/** Labels sit to the right of their pins: the gap plus a label as long as "JAPANESE". */
const LABEL_ROOM = PIN.labelGap + labelWidth('Japanese')
/**
 * The zoom buttons sit in the map's top-right corner. The east margin keeps
 * room for them too, so they never cover a pin or label at the home view
 * (48px of buttons on a 288px-wide phone map is 60 units of a 360 view).
 */
export const CONTROLS_ROOM = 60
/** Keep the shape close to the cards beside it: never a thin strip, never a tall column. */
const MIN_RATIO = 0.75
const MAX_RATIO = 1.1

/** The narrowest home view: the old East Asia width plus room for the zoom buttons. */
const MIN_HOME_WIDTH = BASE_VIEW_WIDTH + CONTROLS_ROOM

/** Fit with margins sized for zoom `k` (pins, labels and buttons are k times bigger in map units). */
function fit(points: MapPoint[], k: number): MapView {
  const padding = Math.max(PADDING, PIN.hitRadius * k + 4)
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  let x = Math.min(...xs) - padding
  let y = Math.min(...ys) - padding
  let width = Math.max(...xs) + Math.max((LABEL_ROOM + CONTROLS_ROOM) * k, padding) - x
  let height = Math.max(...ys) + padding - y

  // Extra width goes to the west: the labels and buttons already pad the east side.
  if (width < MIN_HOME_WIDTH) [x, width] = [x - (MIN_HOME_WIDTH - width), MIN_HOME_WIDTH]
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
 * MIN_HOME_WIDTH, kept to a card-like shape, and inside the drawn map.
 * Margins depend on the zoom (a wider view draws bigger pins, labels and
 * buttons in map units) and the zoom on the margins, so the fit is refined
 * a few times: tap targets aren't cut off and the buttons never cover a label.
 */
export function mapView(points: MapPoint[]): MapView {
  if (points.length === 0) return { x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT }
  let view = fit(points, 1)
  for (let i = 0; i < 3; i++) view = fit(points, pinScale(view))
  return view
}

/** The view for a set of places given in degrees, leaving out any the map doesn't draw. */
export const placesView = (places: { latitude: number; longitude: number }[]) =>
  mapView(places.map((place) => projectPoint(place)).filter(isOnMap))

export type LabelSide = 'right' | 'left' | 'below' | 'above'

export interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

const overlaps = (a: Box, b: Box) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

/**
 * The zoom buttons' corner in map units. Sized for a phone, where the map is
 * smallest and the buttons cover the most of it: 48px wide, 132px tall.
 */
export const controlsBox = (view: MapView): Box => {
  const k = pinScale(view)
  return { left: view.x + view.width - CONTROLS_ROOM * k, right: view.x + view.width, top: view.y, bottom: view.y + 165 * k }
}

/** Where a label would sit on each side of its pin. */
export function labelBox(point: MapPoint, text: string, side: LabelSide, k: number): Box {
  const width = labelWidth(text) * k
  const height = PIN.labelSize * k
  if (side === 'below' || side === 'above') {
    const baseline = side === 'below' ? point.y + 24 * k : point.y - 14 * k
    return { left: point.x - width / 2, right: point.x + width / 2, top: baseline - height, bottom: baseline + height * 0.3 }
  }
  const left = side === 'right' ? point.x + PIN.labelGap * k : point.x - PIN.labelGap * k - width
  return { left, right: left + width, top: point.y - height, bottom: point.y + height * 0.5 }
}

/**
 * Where a pin's label goes: right of the pin if it fits, else left, below
 * or above. It fits when it stays inside the view, covers no other pin (so
 * tapping "Chinese" never opens Korean) and stays clear of the zoom buttons.
 * `others` are the other pins.
 */
export function labelSide(
  point: MapPoint,
  text: string,
  view: MapView,
  others: MapPoint[] = [],
  placedLabels: Box[] = [],
): LabelSide {
  const k = pinScale(view)
  const reach = PIN.radius * k
  // What a label must avoid, weighted by the harm of covering it: under the buttons
  // or off the map it can't be tapped, over a pin it blocks that pin, over another
  // label it only looks crowded (zooming in separates them).
  const obstacles = [
    { box: controlsBox(view), weight: 4 },
    ...others.map((other) => ({
      box: { left: other.x - reach, right: other.x + reach, top: other.y - reach, bottom: other.y + reach },
      weight: 2,
    })),
    ...placedLabels.map((box) => ({ box, weight: 1 })),
  ]
  const cost = (side: LabelSide) => {
    const box = labelBox(point, text, side, k)
    const inside = box.left >= view.x && box.right <= view.x + view.width && box.top >= view.y && box.bottom <= view.y + view.height
    return (inside ? 0 : 4) + obstacles.reduce((total, obstacle) => total + (overlaps(box, obstacle.box) ? obstacle.weight : 0), 0)
  }
  // The first clean side in reading order, else the least bad one.
  const sides = ['right', 'left', 'below', 'above'] as const
  return sides.find((side) => cost(side) === 0) ?? sides.reduce((best, side) => (cost(side) < cost(best) ? side : best))
}

/**
 * A side for every pin's label, placed one at a time so each label also
 * avoids the ones already placed. Pins come in the order given (the seed's
 * order), so the result is stable: labels don't jump around between renders.
 */
export function placeLabels(pins: { point: MapPoint; text: string }[], view: MapView): LabelSide[] {
  const k = pinScale(view)
  const placed: Box[] = []
  return pins.map((pin) => {
    const others = pins.filter((other) => other !== pin).map((other) => other.point)
    const side = labelSide(pin.point, pin.text, view, others, placed)
    placed.push(labelBox(pin.point, pin.text, side, k))
    return side
  })
}

/** How far the map zooms: in until the view is a third of the home view's width, out to the whole drawn map. */
export interface ViewLimits {
  minWidth: number
  maxWidth: number
}

const MAX_ZOOM = 3

/**
 * Zoom limits for a home view. The view keeps the home view's shape at every
 * zoom, so the map's box on the page never changes size.
 */
export function viewLimits(home: MapView): ViewLimits {
  const ratio = home.height / home.width
  const maxWidth = Math.max(home.width, Math.min(MAP_WIDTH, MAP_HEIGHT / ratio))
  return { minWidth: Math.min(home.width, BASE_VIEW_WIDTH) / MAX_ZOOM, maxWidth }
}

/** Slide a view back inside the drawn map. */
export const clampView = (view: MapView): MapView => ({
  ...view,
  x: Math.min(Math.max(view.x, 0), Math.max(0, MAP_WIDTH - view.width)),
  y: Math.min(Math.max(view.y, 0), Math.max(0, MAP_HEIGHT - view.height)),
})

/**
 * Zoom by `factor` (2 = twice as close) keeping `focus` (a map point, such as
 * the spot under the cursor) where it is on screen, within the limits.
 */
export function zoomView(view: MapView, factor: number, focus: MapPoint, limits: ViewLimits): MapView {
  const width = Math.min(Math.max(view.width / factor, limits.minWidth), limits.maxWidth)
  const scale = width / view.width
  return clampView({
    x: focus.x - (focus.x - view.x) * scale,
    y: focus.y - (focus.y - view.y) * scale,
    width,
    height: view.height * scale,
  })
}

/** Move the view by a distance in map units, staying inside the map. */
export const panView = (view: MapView, dx: number, dy: number): MapView => clampView({ ...view, x: view.x + dx, y: view.y + dy })

/** Room to keep around a point, per side, in map units. */
export interface Margins {
  left: number
  right: number
  top: number
  bottom: number
}

/**
 * The view moved just enough that `point` sits inside it with the given
 * margins (for a pin reached with Tab: room on the right for its label and
 * the zoom buttons).
 */
export function revealPoint(view: MapView, point: MapPoint, margins: Margins): MapView {
  const x = Math.min(Math.max(view.x, point.x + margins.right - view.width), point.x - margins.left)
  const y = Math.min(Math.max(view.y, point.y + margins.bottom - view.height), point.y - margins.top)
  return clampView({ ...view, x, y })
}

/** Margins that keep a pin, its label and the zoom buttons clear of each other at this zoom. */
export const pinMargins = (view: MapView, labelText = 'Japanese'): Margins => {
  const k = pinScale(view)
  return {
    left: 30 * k,
    top: 30 * k,
    bottom: 30 * k,
    right: (PIN.labelGap + labelWidth(labelText) + CONTROLS_ROOM) * k,
  }
}

export const viewCenter = (view: MapView): MapPoint => ({ x: view.x + view.width / 2, y: view.y + view.height / 2 })

/**
 * The regional dots that can be links in this view. A dot becomes tappable
 * only when its 24px target overlaps no pin's target, no other dot's and not
 * the zoom buttons. At the home view the dots around Manila are a few pixels
 * apart, so they stay texture; zooming in spreads them and they turn into
 * links one by one. A dot right on a pin (Malabon, Tokyo) never does: its
 * region page is linked from its recipes instead.
 */
export function tappableDots(dots: { id: string; point: MapPoint }[], pins: MapPoint[], view: MapView): Set<string> {
  const k = pinScale(view)
  const reach = PIN.dotHitRadius * k
  const pinReach = PIN.hitRadius * k
  const apart = (a: MapPoint, b: MapPoint, distance: number) => Math.hypot(a.x - b.x, a.y - b.y) >= distance
  const buttons = controlsBox(view)
  const inView = ({ x, y }: MapPoint) =>
    x - reach >= view.x && x + reach <= view.x + view.width && y - reach >= view.y && y + reach <= view.y + view.height
  const underButtons = ({ x, y }: MapPoint) => x + reach > buttons.left && y - reach < buttons.bottom
  return new Set(
    dots
      .filter(({ id, point }) =>
        inView(point) &&
        !underButtons(point) &&
        pins.every((pin) => apart(point, pin, reach + pinReach)) &&
        dots.every((other) => other.id === id || apart(point, other.point, 2 * reach)),
      )
      .map(({ id }) => id),
  )
}
