import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { AiError, aiService } from '@/services/ai'
import type { AiDraft, AiTask } from './schema'

const availableKey = ['ai', 'available'] as const

/** Whether AI works in this environment. Asked once per page load. */
export function useAiAvailable() {
  return useQuery({
    queryKey: availableKey,
    queryFn: () => aiService.isAvailable(),
    staleTime: Infinity,
  }).data
}

/**
 * Ask for one suggestion. A mutation, not a query: it's an action the cook
 * triggers, its result is a draft to review, and it should never be cached
 * or refetched on its own.
 */
export function useAiSuggestion<T extends AiTask>(task: T) {
  const controllerRef = useRef<AbortController | null>(null)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (draft: AiDraft) => {
      controllerRef.current?.abort()
      const controller = new AbortController() // a fresh controller per request
      controllerRef.current = controller
      return aiService.suggest(task, draft, controller.signal)
    },
    onError: (error) => {
      // A decline applies to the whole page: hide every AI button, not just this one.
      if (error instanceof AiError && error.code === 'unavailable') {
        queryClient.setQueryData(availableKey, false)
      }
    },
  })

  // Leaving the page cancels a request still in flight.
  useEffect(() => () => controllerRef.current?.abort(), [])

  return { ...mutation, stop: () => controllerRef.current?.abort() }
}
