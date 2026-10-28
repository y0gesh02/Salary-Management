import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { SalaryInsights } from '@/api/types'
import { api } from '@/lib/api'
import type { InsightParams } from './useInsightParams'

export function useSalaryInsights(params: InsightParams) {
  return useQuery({
    queryKey: ['insights', params],
    queryFn: () => api.get<SalaryInsights>('/insights/salaries', params),
    placeholderData: keepPreviousData,
  })
}
