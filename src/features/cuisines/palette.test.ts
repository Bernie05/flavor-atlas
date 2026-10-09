import { describe, expect, it } from 'vitest'
import indexCss from '@/index.css?raw'
import { cuisinePaletteCss, oklchToLinearSrgb, paletteColor, type Oklch, type Theme } from './palette'

const luminance = ([r, g, b]: number[]) => 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
const fromOklch = (color: Oklch) => luminance(oklchToLinearSrgb(color))
const fromHex = (hex: string) =>
  luminance([1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)))
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

/** The theme's own colors, read from index.css so the test follows any change to them. */
function token(theme: Theme, name: string): number {
  const block = theme === 'light' ? indexCss.slice(0, indexCss.indexOf('@media')) : indexCss.slice(indexCss.indexOf(":root[data-theme='dark']"))
  const hex = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`).exec(block)?.[1]
  if (!hex) throw new Error(`--${name} not found in the ${theme} tokens`)
  return fromHex(hex)
}

const HUES = Array.from({ length: 360 }, (_, hue) => hue)

describe.each(['light', 'dark'] as const)('generated cuisine palette, %s theme', (theme) => {
  const color = (role: 'tint' | 'soft' | 'ink', hue: number) => fromOklch(paletteColor(theme, role, hue))
  const worst = (pair: (hue: number) => number) => Math.min(...HUES.map(pair))

  it('stays inside sRGB for every hue, so the browser shows what was measured', () => {
    for (const hue of HUES)
      for (const role of ['tint', 'soft', 'ink'] as const)
        for (const channel of oklchToLinearSrgb(paletteColor(theme, role, hue))) {
          expect(channel).toBeGreaterThanOrEqual(0)
          expect(channel).toBeLessThanOrEqual(1)
        }
  })

  it('makes ink readable as text (4.5:1) on soft, canvas, surface and the map sea, for every hue', () => {
    for (const background of [(hue: number) => color('soft', hue), () => token(theme, 'canvas'), () => token(theme, 'surface'), () => token(theme, 'accent-soft')]) {
      expect(worst((hue) => contrast(color('ink', hue), background(hue)))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('makes the base color visible as a pin or icon (3:1) on canvas, surface and the sea', () => {
    for (const name of ['canvas', 'surface', 'accent-soft']) {
      expect(worst((hue) => contrast(color('tint', hue), token(theme, name)))).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('cuisinePaletteCss', () => {
  it('writes light and both dark blocks for cuisines with a hue', () => {
    const css = cuisinePaletteCss([{ id: 'vietnamese', hue: 150 }, { id: 'filipino' }])
    expect(css).toContain(':root{--c-vietnamese:oklch(0.55 ')
    expect(css).toContain("@media (prefers-color-scheme: dark){:root:not([data-theme='light']){--c-vietnamese:oklch(0.75 ")
    expect(css).toContain(":root[data-theme='dark']{--c-vietnamese:")
    expect(css).toContain('--c-vietnamese-soft:')
    expect(css).toContain('--c-vietnamese-ink:')
    expect(css).not.toContain('filipino') // keeps its hand-tuned palette
  })

  it('writes nothing when no cuisine has a hue', () => {
    expect(cuisinePaletteCss([{ id: 'filipino' }])).toBe('')
  })

  it('never lets data write arbitrary CSS', () => {
    const css = cuisinePaletteCss([
      { id: 'x;}body{display:none', hue: 10 },
      { id: 'thai', hue: Number.NaN },
      { id: 'thai', hue: '1;color:red' as unknown as number },
    ])
    expect(css).toBe('')
  })
})
