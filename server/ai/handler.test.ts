import { describe, expect, it, vi } from 'vitest'
import type { AiDraft } from '@/features/ai/schema'
import { handleAiRequest, type Generate } from './handler'

const draft: AiDraft = {
  title: 'Chicken Adobo',
  cuisineName: 'Filipino',
  dishName: '',
  variant: '',
  regionName: '',
  servings: 4,
  description: '',
  ingredients: [{ name: 'chicken thighs', quantity: 1, unit: 'kg' }],
  steps: [],
}

describe('handleAiRequest', () => {
  it('rejects an invalid request without calling the model', async () => {
    const generate = vi.fn<Generate>()
    const response = await handleAiRequest({ task: 'description', draft: { ...draft, title: '' } }, generate)
    expect(response).toEqual({ status: 400, body: { error: 'invalid_request', message: 'Give the recipe a name first' } })
    expect(generate).not.toHaveBeenCalled()
  })

  it('rejects unknown tasks', async () => {
    const response = await handleAiRequest({ task: 'write-my-essay', draft }, vi.fn<Generate>())
    expect(response.status).toBe(400)
  })

  it('sends the built prompt and returns the model output', async () => {
    const generate = vi.fn<Generate>().mockResolvedValue({ ok: true, output: { description: 'Tangy and garlicky.' } })
    const response = await handleAiRequest({ task: 'description', draft }, generate)
    expect(response).toEqual({ status: 200, body: { description: 'Tangy and garlicky.' } })
    expect(generate).toHaveBeenCalledWith('description', expect.stringContaining('Title: Chicken Adobo'))
  })

  it.each([
    ['refused', 422],
    ['rate_limited', 429],
    ['not_configured', 503],
    ['invalid_output', 502],
  ] as const)('maps %s to HTTP %i with a readable message', async (code, status) => {
    const response = await handleAiRequest({ task: 'steps', draft }, async () => ({ ok: false, code }))
    expect(response.status).toBe(status)
    expect(response.body).toMatchObject({ error: code, message: expect.any(String) })
  })
})
