import { describe, expect, it } from 'vitest'
import { safeNextPath } from './utils'

describe('safeNextPath', () => {
  it('keeps local paths', () => {
    expect(safeNextPath('/recipes/new?cuisine=korean')).toBe('/recipes/new?cuisine=korean')
  })

  it.each([null, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)'])(
    'falls back to the home page for %s',
    (next) => {
      expect(safeNextPath(next)).toBe('/')
    },
  )
})
