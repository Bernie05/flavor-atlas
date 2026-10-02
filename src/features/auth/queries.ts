import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authService } from '@/services/auth'

export const sessionQuery = queryOptions({
  queryKey: ['auth', 'session'],
  queryFn: () => authService.getSession(),
  staleTime: 5 * 60_000,
})

export const useSession = () => useQuery(sessionQuery)

/** True only once the session is known and grants admin. */
export const useIsAdmin = () => useSession().data?.admin === true

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (password: string) => authService.login(password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionQuery.queryKey }),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionQuery.queryKey }),
  })
}
