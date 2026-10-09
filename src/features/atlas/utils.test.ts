import { describe, expect, it } from 'vitest'
import { BOUNDS, MAP_HEIGHT, MAP_WIDTH } from './mapBounds'
import {
  BASE_VIEW_WIDTH,
  clampView,
  controlsBox,
  CONTROLS_ROOM,
  isOnMap,
  labelBox,
  labelSide,
  mapView,
  panView,
  PIN,
  pinScale,
  placeLabels,
  placesView,
  projectPoint,
  pinMargins,
  revealPoint,
  tappableDots,
  unprojectPoint,
  viewCenter,
  viewLimits,
  zoomView,
} from './utils'

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

describe('unprojectPoint', () => {
  it('turns a point on the map back into the place it came from', () => {
    for (const place of [{ latitude: 21.03, longitude: 105.85 }, { latitude: -6.2, longitude: 106.8 }, { latitude: 47.9, longitude: 106.9 }]) {
      const back = unprojectPoint(projectPoint(place))
      expect(back.latitude).toBeCloseTo(place.latitude, 6)
      expect(back.longitude).toBeCloseTo(place.longitude, 6)
    }
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
    expect(view.width).toBeCloseTo(BASE_VIEW_WIDTH + CONTROLS_ROOM) // the old East Asia view, plus room for the zoom buttons
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

  it('adds extra width to the west, so the home view keeps the coast of Vietnam', () => {
    const view = mapView([manila, beijing, tokyo])
    expect(view.x).toBeLessThanOrEqual(place(16, 108).x) // Da Nang's coast
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
  const home = mapView([manila, beijing, tokyo, seoul])

  it('puts a label right of its pin when there is room', () => {
    expect(labelSide(beijing, 'Chinese', home, [seoul, tokyo, manila])).toBe('right')
  })

  it('moves a label to the left near the east edge of the view', () => {
    // Manila sits low in the view, away from the buttons in the top-right corner.
    const tight = { ...home, width: manila.x - home.x + 20 }
    expect(labelSide(manila, 'Filipino', tight)).toBe('left')
  })

  it('keeps labels clear of the zoom buttons in the top-right corner', () => {
    const buttons = controlsBox(home)
    // A pin just left of the buttons, level with them: its label can't go right.
    const underButtons = { x: buttons.left - 20, y: buttons.top + 40 }
    expect(labelSide(underButtons, 'Japanese', home)).not.toBe('right')
  })

  it('moves a label off another pin once the map zooms out', () => {
    const wide = mapView([manila, beijing, tokyo, seoul, delhi])
    expect(labelSide(beijing, 'Chinese', wide, [seoul])).not.toBe('right')
  })
})

describe('zooming and panning', () => {
  const home = mapView([manila, beijing, tokyo])
  const limits = viewLimits(home)
  const ratio = home.height / home.width

  it('zooms in about the focus point, which stays put on screen', () => {
    const zoomed = zoomView(home, 2, tokyo, limits)
    expect(zoomed.width).toBeCloseTo(home.width / 2)
    // Tokyo is the same fraction across the view before and after.
    expect((tokyo.x - zoomed.x) / zoomed.width).toBeCloseTo((tokyo.x - home.x) / home.width)
  })

  it('keeps the home view shape at every zoom, so the map box never resizes', () => {
    for (const factor of [3, 0.5, 0.1, 10]) {
      const view = zoomView(home, factor, viewCenter(home), limits)
      expect(view.height / view.width).toBeCloseTo(ratio)
    }
  })

  it('stops at 3x in and at the whole map out', () => {
    expect(zoomView(home, 100, viewCenter(home), limits).width).toBeCloseTo(BASE_VIEW_WIDTH / 3)
    const out = zoomView(home, 0.01, viewCenter(home), limits)
    expect(out.width).toBeCloseTo(limits.maxWidth)
    expect(out.height).toBeLessThanOrEqual(MAP_HEIGHT + 1e-9)
  })

  it('pans within the drawn map only', () => {
    expect(panView(home, -10_000, -10_000)).toMatchObject({ x: 0, y: 0 })
    const far = panView(home, 10_000, 10_000)
    expect(far.x + far.width).toBeCloseTo(MAP_WIDTH)
    expect(far.y + far.height).toBeCloseTo(MAP_HEIGHT)
    expect(clampView(home)).toEqual(home)
  })

  it('moves a zoomed view just enough to show a pin reached with Tab', () => {
    const zoomed = zoomView(home, 3, tokyo, limits)
    const even = { left: 20, right: 20, top: 20, bottom: 20 }
    const shown = revealPoint(zoomed, manila, even)
    expect(manila.x).toBeGreaterThanOrEqual(shown.x + 20 - 1e-9)
    expect(manila.y).toBeLessThanOrEqual(shown.y + shown.height - 20 + 1e-9)
    expect(revealPoint(zoomed, tokyo, even)).toEqual(zoomed) // already in view: no jump
  })

  it('leaves room on the right of a revealed pin for its label and the zoom buttons', () => {
    const zoomed = zoomView(home, 3, manila, limits)
    const margins = pinMargins(zoomed)
    const shown = revealPoint(zoomed, tokyo, margins)
    expect(shown.x + shown.width - tokyo.x).toBeGreaterThanOrEqual(margins.right - 1e-9)
  })
})

describe('placeLabels', () => {
  const seoul = place(37.57, 126.98)
  const seedPins = [
    { point: manila, text: 'Filipino' },
    { point: beijing, text: 'Chinese' },
    { point: seoul, text: 'Korean' },
    { point: tokyo, text: 'Japanese' },
  ]
  const hits = (a: { left: number; right: number; top: number; bottom: number }, b: typeof a) =>
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  const boxesFor = (pins: typeof seedPins, view: ReturnType<typeof mapView>) =>
    placeLabels(pins, view).map((side, i) => labelBox(pins[i]!.point, pins[i]!.text, side, pinScale(view)))

  it('leaves every label clear of the others, the pins and the buttons at the home view', () => {
    const view = mapView(seedPins.map((pin) => pin.point))
    const boxes = boxesFor(seedPins, view)
    for (const [i, box] of boxes.entries()) {
      expect(hits(box, controlsBox(view)), seedPins[i]!.text).toBe(false)
      for (const [j, other] of boxes.entries()) if (i !== j) expect(hits(box, other), `${seedPins[i]!.text} / ${seedPins[j]!.text}`).toBe(false)
    }
  })

  it('zoomed far out, never puts a label under the buttons or over a pin; crowded labels may touch', () => {
    const pins = [...seedPins, { point: delhi, text: 'Indian' }]
    const view = mapView(pins.map((pin) => pin.point))
    const reach = PIN.radius * pinScale(view)
    for (const [i, box] of boxesFor(pins, view).entries()) {
      expect(hits(box, controlsBox(view)), pins[i]!.text).toBe(false)
      for (const [j, pin] of pins.entries())
        if (i !== j) {
          const dot = { left: pin.point.x - reach, right: pin.point.x + reach, top: pin.point.y - reach, bottom: pin.point.y + reach }
          expect(hits(box, dot), `${pins[i]!.text} over ${pin.text}`).toBe(false)
        }
    }
  })
})

describe('tappableDots', () => {
  const region = (id: string, latitude: number, longitude: number) => ({ id, point: place(latitude, longitude) })
  // The Philippine kitchens from the seed, around the Manila pin.
  const dots = [
    region('batangas', 13.76, 121.06),
    region('bicol', 13.62, 123.19),
    region('pampanga', 15.03, 120.69),
    region('malabon', 14.66, 120.96),
    region('lucban', 14.11, 121.56),
    region('tuguegarao', 17.61, 121.73),
  ]
  const pins = [manila, beijing, tokyo]
  const home = mapView([...pins, ...dots.map((d) => d.point)])

  it('keeps crowded dots as texture at the home view', () => {
    const tappable = tappableDots(dots, pins, home)
    for (const crowded of ['batangas', 'pampanga', 'malabon', 'lucban', 'bicol']) expect(tappable.has(crowded)).toBe(false)
  })

  it('turns dots into links as zooming in spreads them apart', () => {
    const zoomed = zoomView(home, 3, manila, viewLimits(home))
    const tappable = tappableDots(dots, pins, zoomed)
    expect([...tappable].toSorted()).toEqual(['bicol', 'tuguegarao'])
    expect(tappableDots(dots, pins, home).size).toBeLessThan(tappable.size)
  })

  it('never makes a dot sitting on a pin tappable, at any zoom', () => {
    const zoomed = zoomView(home, 3, manila, viewLimits(home))
    expect(tappableDots(dots, pins, zoomed).has('malabon')).toBe(false) // 7 km from the Manila pin
  })

  it('leaves out a dot whose target a label would cover', () => {
    const zoomed = zoomView(home, 3, manila, viewLimits(home))
    const bicol = dots.find((d) => d.id === 'bicol')!.point
    const label = { left: bicol.x - 2, right: bicol.x + 40, top: bicol.y - 2, bottom: bicol.y + 2 }
    expect(tappableDots(dots, pins, zoomed, [label]).has('bicol')).toBe(false)
  })

  it('leaves out dots outside the view', () => {
    const zoomed = zoomView(home, 3, tokyo, viewLimits(home))
    expect(tappableDots(dots, pins, zoomed).size).toBe(0)
  })
})
