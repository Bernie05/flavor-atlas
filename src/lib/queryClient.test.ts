import { focusManager } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { queryClient } from './queryClient'

describe('queryClient', () => {
  // Regression: a schema error used to be retried, and TanStack pauses
  // retries while the tab is hidden, so the page sat on its skeleton.
  it('fails at once on data in the wrong shape, even in a hidden tab', async () => {
    const badData = z.object({ countryCode: z.string() }).safeParse({}).error
    focusManager.setFocused(false)
    try {
      await expect(
        queryClient.fetchQuery({ queryKey: ['bad-shape'], queryFn: () => Promise.reject(badData) }),
      ).rejects.toBeInstanceOf(z.ZodError)
    } finally {
      focusManager.setFocused(undefined)
      queryClient.clear()
    }
  })
})
