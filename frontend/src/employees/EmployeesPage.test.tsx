import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EmployeeSummary } from '@/api/types'
import { setCsrfToken } from '@/lib/api'
import { fakeApi } from '@/test/fake-api'
import { renderApp } from '@/test/render-app'

afterEach(() => {
  vi.unstubAllGlobals()
  setCsrfToken(null)
})

const priya: EmployeeSummary = {
  id: 1,
  full_name: 'Priya Sharma',
  email: 'priya@acme.example',
  job_title: 'Software Engineer',
  department: 'Engineering',
  country: { code: 'IN', name: 'India' },
  hire_date: '2022-01-10',
  current_salary: {
    id: 10, amount: '150000.0', currency: 'INR', period: 'monthly', annual_amount: '1800000.0',
    effective_date: '2024-04-01',
  },
}
const newcomer: EmployeeSummary = {
  ...priya, id: 2, full_name: 'New Joiner', email: 'new@acme.example', current_salary: null,
}

const filters = {
  countries: [{ code: 'IN', name: 'India', currency: 'INR' }, { code: 'US', name: 'United States', currency: 'USD' }],
  departments: ['Engineering', 'Sales'],
  job_titles: ['Account Executive', 'Software Engineer'],
  currencies: ['INR', 'USD'],
  periods: ['annual', 'monthly'],
}

function setup({ employees = [priya, newcomer], total }: { employees?: EmployeeSummary[]; total?: number } = {}) {
  total ??= employees.length
  const calls = fakeApi({
    'GET /api/session': { body: { user: { email: 'hr@acme.test' }, csrf_token: 't' } },
    'GET /api/filters': { body: filters },
    'GET /api/employees': ({ url }) => ({
      body: { data: employees, meta: { page: Number(url.searchParams.get('page') ?? 1), per_page: 25, total } },
    }),
  })
  const lastDirectoryQuery = () =>
    calls.filter((call) => call.url.pathname === '/api/employees').at(-1)?.url.searchParams
  return { calls, lastDirectoryQuery }
}

describe('Employees directory', () => {
  it('lists employees with their annual salary in its own currency', async () => {
    setup()
    renderApp('/employees')

    const row = (await screen.findByText('Priya Sharma')).closest('tr')!
    expect(within(row).getByText('INR 1,800,000')).toBeInTheDocument()
    expect(within(row).getByText('paid INR 150,000 / month')).toBeInTheDocument()
    expect(within(row).getByText('India')).toBeInTheDocument()
    expect(screen.getByText('Showing 1–2 of 2 employees')).toBeInTheDocument()
  })

  it('says so when an employee has no salary in effect yet', async () => {
    setup()
    renderApp('/employees')

    const row = (await screen.findByText('New Joiner')).closest('tr')!
    expect(within(row).getByText('No current salary')).toBeInTheDocument()
  })

  it('links each employee to their page', async () => {
    setup()
    renderApp('/employees')

    expect(await screen.findByRole('link', { name: 'Priya Sharma' })).toHaveAttribute('href', '/employees/1')
  })

  it('searches by name or email as the HR manager types, and keeps it in the URL', async () => {
    const { lastDirectoryQuery } = setup()
    const router = renderApp('/employees')

    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search employees' }), 'priya')

    await waitFor(() => expect(lastDirectoryQuery()?.get('q')).toBe('priya'))
    expect(router.state.location.search).toContain('q=priya')
  })

  it("doesn't eat a space typed right after a pause", async () => {
    const { lastDirectoryQuery } = setup()
    renderApp('/employees')
    const searchbox = await screen.findByRole('searchbox', { name: 'Search employees' })

    await userEvent.type(searchbox, 'priya ')
    await waitFor(() => expect(lastDirectoryQuery()?.get('q')).toBe('priya'))
    await userEvent.type(searchbox, 'sh')

    expect(searchbox).toHaveValue('priya sh')
    await waitFor(() => expect(lastDirectoryQuery()?.get('q')).toBe('priya sh'))
  })

  it('filters by country and goes back to the first page', async () => {
    const { lastDirectoryQuery } = setup({ total: 60 })
    renderApp('/employees?page=2')
    await screen.findByText('Priya Sharma')

    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Country' }), 'IN')

    await waitFor(() => expect(lastDirectoryQuery()?.get('country')).toBe('IN'))
    expect(lastDirectoryQuery()?.get('page')).toBeNull()
  })

  it('sorts by a column, toggling the direction on a second click', async () => {
    const { lastDirectoryQuery } = setup()
    renderApp('/employees')

    const sortBySalary = await screen.findByRole('button', { name: 'Sort by annual salary' })
    await userEvent.click(sortBySalary)
    await waitFor(() => expect(lastDirectoryQuery()?.get('sort')).toBe('annual_salary'))
    expect(screen.getByRole('columnheader', { name: /annual salary/i })).toHaveAttribute('aria-sort', 'ascending')

    await userEvent.click(sortBySalary)
    await waitFor(() => expect(lastDirectoryQuery()?.get('sort')).toBe('-annual_salary'))
    expect(screen.getByRole('columnheader', { name: /annual salary/i })).toHaveAttribute('aria-sort', 'descending')
  })

  it('pages through results', async () => {
    const { lastDirectoryQuery } = setup({ total: 60 })
    renderApp('/employees')
    await screen.findByText('Priya Sharma')

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))

    await waitFor(() => expect(lastDirectoryQuery()?.get('page')).toBe('2'))
    expect(await screen.findByText('Showing 26–50 of 60 employees')).toBeInTheDocument()
  })

  it('restores search, filters, sort and page from a shared URL', async () => {
    const { lastDirectoryQuery } = setup({ total: 100 })
    renderApp('/employees?q=sharma&country=IN&department=Engineering&sort=-hire_date&page=3')

    await waitFor(() => expect(Object.fromEntries(lastDirectoryQuery()!)).toEqual({
      q: 'sharma', country: 'IN', department: 'Engineering', sort: '-hire_date', page: '3',
    }))
    expect(await screen.findByRole('searchbox', { name: 'Search employees' })).toHaveValue('sharma')
    expect(await screen.findByRole('combobox', { name: 'Country' })).toHaveValue('IN')
  })

  it('offers a way out when nothing matches', async () => {
    setup({ employees: [] })
    const router = renderApp('/employees?country=US')

    expect(await screen.findByText('No employees match these filters.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    await waitFor(() => expect(router.state.location.search).toBe(''))
  })
})
