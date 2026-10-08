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

/**
 * Where a pin's label goes: to the right, or below the pin near the east
 * edge, so "Japanese" neither runs off the map nor stacks onto "Korean".
 */
export const labelSide = ({ x }: MapPoint, labelWidth: number): 'right' | 'below' =>
  x + labelWidth + 14 > MAP_WIDTH ? 'below' : 'right'
