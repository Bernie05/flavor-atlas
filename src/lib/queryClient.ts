import { QueryClient } from '@tanstack/react-query'
import { NotFoundError } from '@/services/data'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Recipes rarely change while you're reading them, so avoid
      // refetching on every window focus.
      staleTime: 60_000,
      // Retry flaky network errors once, but a missing recipe won't
      // appear on a second try.
      retry: (failureCount, error) => !(error instanceof NotFoundError) && failureCount < 1,
    },
  },
})
