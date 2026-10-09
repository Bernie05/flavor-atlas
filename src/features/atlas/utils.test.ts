import { describe, expect, it } from 'vitest'
import { BOUNDS, MAP_HEIGHT, MAP_WIDTH } from './mapBounds'
import { BASE_VIEW_WIDTH, isOnMap, labelSide, mapView, PIN, pinScale, placesView, projectPoint } from './utils'

describe('projectPoint', () => {
  it('maps the corners of BOUNDS to the corners of the map', () => {
    const nw = projectPoint({ latitude: BOUNDS.north, longitude: BOUNDS.west })
    const se = projectPoint({ latitude: BOUNDS.south, longitude: BOUNDS.east })
    expect(nw.x).toBeCloseTo(0)
    expect(nw.y).toBeCloseTo(0)
    expect(se.x).toBeCloseTo(MAP_WIDTH)
    expect(se.y).toBeCloseTo(MAP_HEIGHT, 0) // the generator rounds the height
  })

  it('puts places where they belong relative to each other', () => {
    const manila = projectPoint({ latitude: 14.6, longitude: 120.98 })
    const tokyo = projectPoint({ latitude: 35.68, longitude: 139.69 })
    const beijing = projectPoint({ latitude: 39.9, longitude: 116.41 })
    expect(tokyo.x).toBeGreaterThan(manila.x) // east is right
    expect(beijing.y).toBeLessThan(manila.y) // north is up
  })
})

describe('isOnMap', () => {
  it('keeps places inside BOUNDS and drops the rest', () => {
    expect(isOnMap(projectPoint({ latitude: 14.6, longitude: 120.98 }))).toBe(true)
    expect(isOnMap(projectPoint({ latitude: 41.9, longitude: 12.5 }))).toBe(false) // Rome
  })
})

const place = (latitude: number, longitude: number) => projectPoint({ latitude, longitude })
const manila = place(14.6, 120.98)
const beijing = place(39.9, 116.41)
const tokyo = place(35.68, 139.69)
const bangkok = place(13.75, 100.5)
const delhi = place(28.61, 77.21)
const inView = (view: ReturnType<typeof mapView>, p: { x: number; y: number }) =>
  p.x >= view.x && p.x <= view.x + view.width && p.y >= view.y && p.y <= view.y + view.height

describe('mapView', () => {
  it('shows the whole map when there is nothing to fit', () => {
    expect(mapView([])).toEqual({ x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT })
  })

  it('zooms to East Asia when the cuisines are all there', () => {
    const view = mapView([manila, beijing, tokyo])
    expect(view.width).toBeCloseTo(BASE_VIEW_WIDTH)
    expect(view.height / view.width).toBeGreaterThanOrEqual(0.75 - 1e-9)
    for (const p of [manila, beijing, tokyo]) expect(inView(view, p)).toBe(true)
    expect(inView(view, delhi)).toBe(false)
  })

  it('widens to take in a new cuisine, with room around its pin', () => {
    const view = mapView([manila, beijing, tokyo, bangkok])
    expect(inView(view, bangkok)).toBe(true)
    expect(bangkok.x - view.x).toBeGreaterThanOrEqual(30) // not on the edge
    expect(mapView([manila, beijing, tokyo, bangkok, delhi]).width).toBeGreaterThan(view.width)
  })

  it('leaves room for a whole tap target at the edge, however far it zooms out', () => {
    const view = mapView([manila, beijing, tokyo, bangkok, delhi])
    const reach = PIN.hitRadius * pinScale(view)
    expect(delhi.x - reach).toBeGreaterThanOrEqual(view.x)
  })

  it('adds extra width to the west, where the labels are not', () => {
    const view = mapView([manila, beijing, tokyo])
    const eastRoom = view.x + view.width - tokyo.x
    expect(beijing.x - view.x).toBeGreaterThan(eastRoom) // Vietnam's coast in view, not empty Pacific
  })

  it('stays inside the drawn map and keeps a card-like shape', () => {
    const corner = mapView([place(BOUNDS.north, BOUNDS.west), place(BOUNDS.south, BOUNDS.east)])
    expect(corner).toEqual({ x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT })
    const tall = mapView([place(50, 120), place(-8, 120)])
    expect(tall.height / tall.width).toBeLessThanOrEqual(1.1 + 1e-9)
    expect(tall.x).toBeGreaterThanOrEqual(0)
  })
})

describe('placesView', () => {
  it('fits places given in degrees and ignores ones off the map', () => {
    const rome = { latitude: 41.9, longitude: 12.5 }
    const asia = [
      { latitude: 14.6, longitude: 120.98 },
      { latitude: 35.68, longitude: 139.69 },
    ]
    expect(placesView([...asia, rome])).toEqual(placesView(asia))
  })
})

describe('labelSide', () => {
  const seoul = place(37.57, 126.98)
  const japanView = mapView([manila, beijing, tokyo])

  it('puts a label right of its pin when there is room', () => {
    expect(labelSide(beijing, 'Chinese', japanView, [seoul, tokyo, manila])).toBe('right')
  })

  it('moves a label below its pin near the east edge of the view', () => {
    expect(labelSide(tokyo, 'Japanese', { ...japanView, width: tokyo.x - japanView.x + 20 })).toBe('below')
  })

  it('moves a label below when it would cover another pin once the map zooms out', () => {
    const wide = mapView([manila, beijing, tokyo, seoul, delhi])
    expect(labelSide(beijing, 'Chinese', wide, [seoul])).toBe('below')
  })
})
