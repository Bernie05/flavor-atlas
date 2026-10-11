import { MutationCache, QueryClient } from '@tanstack/react-query'
import { activityQueries } from '@/features/activity/queries'
import '@/features/activity/meta'
import { sessionQuery } from '@/features/auth/queries'
import { dataService, isRetryable, UnauthorizedError } from '@/services/data'

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
    // A mutation marked with activityMeta goes into the change history once it succeeds.
    // Best effort: the change itself is saved, so a history that can't be written
    // must not turn it into an error.
    onSuccess: (data, variables, _context, mutation) => {
      const entry = mutation.meta?.activity?.(data, variables)
      if (!entry) return
      void dataService
        .logActivity(entry)
        .then(() => queryClient.invalidateQueries({ queryKey: activityQueries.all() }))
        .catch(() => {})
    },
  }),
})
