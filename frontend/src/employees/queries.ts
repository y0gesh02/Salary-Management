import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EmployeeDetail, EmployeeSummary, FilterOptions, Page, Period } from '@/api/types'
import { api } from '@/lib/api'
import type { DirectoryParams } from './useDirectoryParams'

// The directory lives under ['employees', params]; a single employee under ['employee', id],
// so refreshing the directory never refetches the page the HR manager is looking at.
const employeeKey = (id: string) => ['employee', id]

export function useEmployees(params: DirectoryParams) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => api.get<Page<EmployeeSummary>>('/employees', params),
    // Keep showing the current page while the next one loads, so the table doesn't flash empty.
    placeholderData: keepPreviousData,
  })
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKey(id),
    queryFn: () => api.get<EmployeeDetail>(`/employees/${id}`),
  })
}

export function useFilterOptions() {
  return useQuery({
    queryKey: ['filters'],
    queryFn: () => api.get<FilterOptions>('/filters'),
    staleTime: 5 * 60 * 1000,
  })
}

export type SalaryChange = { amount: string; currency: string; period: Period; effective_date: string }

export function useRecordSalaryChange(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (salary_record: SalaryChange) =>
      api.post<EmployeeDetail>(`/employees/${id}/salary_records`, { salary_record }),
    onSuccess: (employee) => {
      // The response is the updated employee, so the page updates without another request.
      queryClient.setQueryData(employeeKey(id), employee)
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
      void queryClient.invalidateQueries({ queryKey: ['insights'] })
    },
  })
}

export function useDeleteEmployee(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(`/employees/${id}`),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: employeeKey(id) })
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
      void queryClient.invalidateQueries({ queryKey: ['insights'] })
      void queryClient.invalidateQueries({ queryKey: ['filters'] })
    },
  })
}
