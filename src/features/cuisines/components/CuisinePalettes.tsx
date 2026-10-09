import { useQuery } from '@tanstack/react-query'
import { cuisineQueries } from '../queries'
import { cuisinePaletteCss } from '../palette'

/**
 * Publishes the colors of cuisines added with a hue (palette.ts) as CSS
 * variables, so cuisineTint() and every bg-tint / text-tint-ink just work for
 * them. Renders nothing until the cuisines load or when none has a hue.
 */
export function CuisinePalettes() {
  const cuisines = useQuery(cuisineQueries.list()).data
  const css = cuisines ? cuisinePaletteCss(cuisines) : ''
  return css ? <style>{css}</style> : null
}
