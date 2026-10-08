import { MutationCache, QueryClient } from '@tanstack/react-query'
import { sessionQuery } from '@/features/auth/queries'
import { isRetryable, UnauthorizedError } from '@/services/data'

export const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Recipes rarely change while you're reading them, so avoid
      // refetching on every window focus.
      staleTime: 60_000,
      // Retry a flaky network or server error once. Never retry what fails the
      // same way every time (404, bad data): TanStack pauses retries while the
      // tab is hidden, so a pointless retry kept a background tab on its
      // loading skeleton until the tab came back.
      retry: (failureCount, error) => isRetryable(error) && failureCount < 1,
    },
  },
  mutationCache: new MutationCache({
    // Any change refused with 401 means the session ended (expired, or logged
    // out in another tab): refresh it so the UI hides admin controls everywhere.
    onError: (error) => {
      if (error instanceof UnauthorizedError) {
        void queryClient.invalidateQueries({ queryKey: sessionQuery.queryKey })
      }
    },
  }),
})
