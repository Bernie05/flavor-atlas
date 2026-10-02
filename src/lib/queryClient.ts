import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Recipes rarely change while you're reading them, so avoid
      // refetching on every window focus.
      staleTime: 60_000,
      retry: 1,
    },
  },
})
