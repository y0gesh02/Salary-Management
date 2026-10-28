import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { EmployeeSummary, FilterOptions, Page } from '@/api/types'
import { api } from '@/lib/api'
import type { DirectoryParams } from './useDirectoryParams'

export function useEmployees(params: DirectoryParams) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => api.get<Page<EmployeeSummary>>('/employees', params),
    // Keep showing the current page while the next one loads, so the table doesn't flash empty.
    placeholderData: keepPreviousData,
  })
}

export function useFilterOptions() {
  return useQuery({
    queryKey: ['filters'],
    queryFn: () => api.get<FilterOptions>('/filters'),
    staleTime: 5 * 60 * 1000,
  })
}
