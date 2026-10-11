import type { ActivityInput } from './schema'

/** Turns a successful change into a history entry; undefined records nothing. */
export type ActivityDescriber = (data: unknown, variables: unknown) => ActivityInput | undefined

// Tells TanStack Query what `meta` a mutation may carry, so `mutation.meta.activity` is typed everywhere.
declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: { activity?: ActivityDescriber }
  }
}

/**
 * Marks a mutation for the change history: `meta: activityMeta((saved, input) => ({ … }))`.
 * One MutationCache handler (lib/queryClient.ts) writes the entry after any
 * marked mutation succeeds, so no hook repeats the logging. The describer is
 * written with the mutation's own types; the cast happens once, here.
 */
export const activityMeta = <TData, TVariables>(describe: (data: TData, variables: TVariables) => ActivityInput | undefined) => ({
  activity: describe as ActivityDescriber,
})
