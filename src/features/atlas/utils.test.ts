import { describe, expect, it } from 'vitest'
import { BOUNDS, MAP_HEIGHT, MAP_WIDTH } from './landPath'
import { isOnMap, labelSide, projectPoint } from './utils'

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

describe('labelSide', () => {
  it('moves a label below its pin near the east edge', () => {
    expect(labelSide({ x: 100, y: 0 }, 60)).toBe('right')
    expect(labelSide({ x: MAP_WIDTH - 40, y: 0 }, 60)).toBe('below')
  })
})
