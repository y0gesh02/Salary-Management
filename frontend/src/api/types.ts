// Shapes returned by the Rails API (see app/serializers). Money is a decimal string.

export type Period = 'annual' | 'monthly'

export type SalaryRecord = {
  id: number
  amount: string
  currency: string
  period: Period
  annual_amount: string
  effective_date: string
  status?: 'past' | 'current' | 'scheduled'
}

export type EmployeeSummary = {
  id: number
  full_name: string
  email: string
  job_title: string
  department: string
  country: { code: string; name: string }
  hire_date: string
  current_salary: SalaryRecord | null
}

export type EmployeeDetail = EmployeeSummary & { salary_history: SalaryRecord[] }

export type Page<T> = {
  data: T[]
  meta: { page: number; per_page: number; total: number }
}

export type FilterOptions = {
  countries: { code: string; name: string; currency: string }[]
  departments: string[]
  job_titles: string[]
  currencies: string[]
  periods: Period[]
}

export type GroupBy = 'country' | 'department' | 'job_title'

// One row per (group, currency): amounts in different currencies are never combined.
export type InsightRow = {
  group: { key: string; label: string }
  currency: string
  headcount: number
  min: string
  max: string
  average: string
  median: string
  total: string
}

export type SalaryInsights = { group_by: GroupBy; as_of: string; data: InsightRow[] }

