import { MutationCache, QueryClient } from '@tanstack/react-query'
import { sessionQuery } from '@/features/auth/queries'
import { NotFoundError, UnauthorizedError } from '@/services/data'

export const queryClient: QueryClient = new QueryClient({
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
