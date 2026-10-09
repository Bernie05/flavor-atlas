import { queryOptions } from '@tanstack/react-query'
import { dataService } from '@/services/data'

/** The review queue: visitor reviews waiting for the admin (admin only). */
export const submissionQueries = {
  all: () => ['submissions'] as const,
  list: () => queryOptions({ queryKey: [...submissionQueries.all(), 'list'], queryFn: () => dataService.listSubmissions() }),
}
