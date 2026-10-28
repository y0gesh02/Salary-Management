import type { FilterOptions } from '@/api/types'

export const filterOptions: FilterOptions = {
  countries: [
    { code: 'IN', name: 'India', currency: 'INR' },
    { code: 'US', name: 'United States', currency: 'USD' },
    { code: 'DE', name: 'Germany', currency: 'EUR' },
  ],
  departments: ['Engineering', 'Sales'],
  job_titles: ['Account Executive', 'Software Engineer'],
  currencies: ['EUR', 'INR', 'USD'],
  periods: ['annual', 'monthly'],
}
