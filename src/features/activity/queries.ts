import { queryOptions } from '@tanstack/react-query'
import { dataService } from '@/services/data'

export const activityQueries = {
  all: () => ['activity'] as const,
  list: () => queryOptions({ queryKey: [...activityQueries.all(), 'list'], queryFn: () => dataService.listActivity() }),
}
