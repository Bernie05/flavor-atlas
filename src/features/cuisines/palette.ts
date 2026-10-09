import type { Cuisine } from './schema'

/**
 * Colors for a cuisine from a single hue (0-360), so a cuisine added from the
 * admin needs no CSS. OKLCH keeps lightness perceptual: at a fixed L every hue
 * looks equally light, so the contrast of each role holds for any hue
 * (palette.test.ts checks all 360, in both themes). Chroma is capped per hue
 * to stay inside sRGB, where the browser shows exactly the color we measured.
 * The four seed cuisines keep their hand-tuned palettes in index.css.
 */
export const PALETTE_ROLES = {
  light: {
    /** Pins, accents and large numerals. */
    tint: { l: 0.55, c: 0.15 },
    /** Backgrounds: headers, badges, cards. */
    soft: { l: 0.94, c: 0.04 },
    /** Text on soft, canvas and surface. */
    ink: { l: 0.45, c: 0.12 },
  },
  dark: {
    tint: { l: 0.75, c: 0.14 },
    soft: { l: 0.28, c: 0.06 },
    ink: { l: 0.86, c: 0.09 },
  },
} as const

export type Theme = keyof typeof PALETTE_ROLES
export type Role = keyof (typeof PALETTE_ROLES)['light']
export type Oklch = readonly [l: number, c: number, h: number]

/** OKLCH to linear-light sRGB (Björn Ottosson's matrices). Channels outside 0-1 are out of gamut. */
export function oklchToLinearSrgb([l, c, h]: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l3 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m3 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s3 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ]
}

const inGamut = (color: Oklch) => oklchToLinearSrgb(color).every((channel) => channel >= 0 && channel <= 1)

/** The most chroma this lightness and hue can have inside sRGB (binary search). */
function maxChroma(l: number, h: number): number {
  let low = 0
  let high = 0.4
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2
    if (inGamut([l, mid, h])) low = mid
    else high = mid
  }
  return low
}

/** One role's color for a hue, as [L, C, H]. */
export function paletteColor(theme: Theme, role: Role, hue: number): Oklch {
  const { l, c } = PALETTE_ROLES[theme][role]
  // A hair under the edge, so rounding in the CSS can't push it out of gamut.
  return [l, Math.min(c, maxChroma(l, hue) * 0.97), hue]
}

const css = ([l, c, h]: Oklch) => `oklch(${l} ${c.toFixed(4)} ${h})`

/** Cuisine ids become CSS variable names, so only plain slugs are allowed. */
export const CUISINE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function declarations(theme: Theme, cuisines: Pick<Cuisine, 'id' | 'hue'>[]) {
  return cuisines
    .map(({ id, hue = 0 }) =>
      (['tint', 'soft', 'ink'] as const)
        .map((role) => `--c-${id}${role === 'tint' ? '' : `-${role}`}:${css(paletteColor(theme, role, hue))};`)
        .join(''),
    )
    .join('')
}

/**
 * CSS for every cuisine that has a hue: its --c-<id>, -soft and -ink in light
 * and in both dark selectors, matching the token blocks in index.css. Ids that
 * aren't slugs and hues that aren't numbers are skipped, so data can never
 * write arbitrary CSS.
 */
export function cuisinePaletteCss(cuisines: Pick<Cuisine, 'id' | 'hue'>[]): string {
  const hued = cuisines.filter(
    (cuisine) => CUISINE_ID.test(cuisine.id) && typeof cuisine.hue === 'number' && Number.isFinite(cuisine.hue),
  )
  if (hued.length === 0) return ''
  const light = declarations('light', hued)
  const dark = declarations('dark', hued)
  return (
    `:root{${light}}` +
    `@media (prefers-color-scheme: dark){:root:not([data-theme='light']){${dark}}}` +
    `:root[data-theme='dark']{${dark}}`
  )
}
