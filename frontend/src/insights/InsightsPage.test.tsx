import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { InsightRow } from '@/api/types'
import { fakeApi } from '@/test/fake-api'
import { filterOptions } from '@/test/fixtures'
import { renderApp } from '@/test/render-app'

afterEach(() => vi.unstubAllGlobals())

const row = (label: string, currency: string, headcount: number, median: string, overrides: Partial<InsightRow> = {}): InsightRow => ({
  group: { key: label, label }, currency, headcount,
  min: '1000000.0', max: '4000000.0', average: median, median, total: '9000000.0', ...overrides,
})

// Engineering is paid in two currencies: the rows stay separate, never added together.
const byDepartment = [
  row('Engineering', 'INR', 120, '2400000.0', { min: '900000.0', max: '6100000.5', average: '2512345.67', total: '301481480.4' }),
  row('Sales', 'INR', 80, '1500000.0'),
  row('Engineering', 'USD', 40, '145000.0', { min: '90000.0', max: '260000.0' }),
  row('Sales', 'USD', 15, '120000.0', { min: '80000.0', max: '200000.0' }),
]

function setup(rows: InsightRow[] = byDepartment) {
  const calls = fakeApi({
    'GET /api/session': { body: { user: { email: 'hr@incubyte.test' }, csrf_token: 't' } },
    'GET /api/filters': { body: filterOptions },
    'GET /api/insights/salaries': ({ url }) => ({
      body: { group_by: url.searchParams.get('group_by'), as_of: '2026-10-28', data: rows },
    }),
  })
  const lastQuery = () => calls.filter((call) => call.url.pathname === '/api/insights/salaries').at(-1)?.url.searchParams
  return { lastQuery }
}

describe('Salary insights', () => {
  it('summarises current annual salaries per group and currency, as of today', async () => {
    const { lastQuery } = setup()
    renderApp('/insights')

    const table = await screen.findByRole('table', { name: 'Salary statistics' })
    expect(lastQuery()?.get('group_by')).toBe('country')
    const engineeringInr = within(table).getAllByRole('row').find((tr) => tr.textContent?.includes('INR') && tr.textContent.includes('Engineering'))!
    expect(within(engineeringInr).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      'Engineering', 'INR', '120', '900,000', '2,400,000', '2,512,345.67', '6,100,000.50', '301,481,480.40',
    ])
    expect(screen.getByText(/as of 2026-10-28/)).toBeInTheDocument()
    expect(screen.getByText(/never converted/)).toBeInTheDocument()
  })

  it('groups by another dimension and filters, keeping the choice in the URL', async () => {
    const { lastQuery } = setup()
    const router = renderApp('/insights')

    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Group by' }), 'department')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Country' }), 'IN')

    await waitFor(() => expect(lastQuery()?.get('country')).toBe('IN'))
    expect(lastQuery()?.get('group_by')).toBe('department')
    expect(router.state.location.search).toBe('?group_by=department&country=IN')

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Country' }), '')
    await waitFor(() => expect(router.state.location.search).toBe('?group_by=department'))
  })

  it('charts one currency at a time, starting with the one most employees are paid in', async () => {
    setup()
    renderApp('/insights?group_by=department')

    const chart = await screen.findByRole('figure', { name: 'Median annual salary by department, INR' })
    // Highest median first; the range line runs from the lowest to the highest salary.
    expect(within(chart).getAllByTestId('chart-label').map((label) => label.textContent)).toEqual(['Engineering', 'Sales'])
    expect(within(chart).getByText('INR 2.4M')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Chart currency' }), 'USD')
    expect(screen.getByRole('figure', { name: 'Median annual salary by department, USD' })).toBeInTheDocument()
  })

  it('falls back to the main currency when a filter removes the one being charted', async () => {
    const fakeRows = { IN: byDepartment.filter((row) => row.currency === 'INR') }
    fakeApi({
      'GET /api/session': { body: { user: { email: 'hr@incubyte.test' }, csrf_token: 't' } },
      'GET /api/filters': { body: filterOptions },
      'GET /api/insights/salaries': ({ url }) => ({
        body: { group_by: 'department', as_of: '2026-10-28', data: url.searchParams.get('country') === 'IN' ? fakeRows.IN : byDepartment },
      }),
    })
    renderApp('/insights?group_by=department')

    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Chart currency' }), 'USD')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Country' }), 'IN')

    expect(await screen.findByRole('figure', { name: 'Median annual salary by department, INR' })).toBeInTheDocument()
  })

  it('shows the full figures for a group on hover or keyboard focus', async () => {
    setup()
    renderApp('/insights?group_by=department')

    const chart = await screen.findByRole('figure', { name: /INR/ })
    await userEvent.hover(within(chart).getByRole('listitem', { name: /Engineering/ }))

    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip).toHaveTextContent('Engineering · 120 employees')
    expect(tooltip).toHaveTextContent('Median INR 2,400,000')
    expect(tooltip).toHaveTextContent('Range INR 900,000 – INR 6,100,000.50')
  })

  it('compares headcount when grouped by country, since each country pays in its own currency', async () => {
    setup([
      row('Singapore', 'SGD', 50, '117500.0'),
      row('India', 'INR', 3607, '2149100.0'),
      row('Germany', 'EUR', 726, '83250.0'),
      row('Germany', 'USD', 10, '150000.0'), // paid in another currency: still counts for Germany
    ])
    renderApp('/insights')

    const chart = await screen.findByRole('figure', { name: 'Headcount by country' })
    expect(within(chart).getAllByTestId('chart-label').map((label) => label.textContent)).toEqual(['India', 'Germany', 'Singapore'])
    expect(within(chart).getByText('3,607')).toBeInTheDocument()
    expect(within(chart).getByText('736')).toBeInTheDocument()
    // No salary axis here, so there is no currency to pick and no "nothing to compare" message.
    expect(screen.queryByRole('combobox', { name: 'Chart currency' })).not.toBeInTheDocument()
    expect(screen.queryByText(/nothing to compare/)).not.toBeInTheDocument()
  })

  it('explains instead of drawing a one-bar chart', async () => {
    setup([row('Engineering', 'INR', 200, '2000000.0'), row('Sales', 'USD', 50, '140000.0')])
    renderApp('/insights?group_by=department')

    await screen.findByRole('table', { name: 'Salary statistics' })
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
    expect(screen.getByText(/Only one group is paid in INR/)).toBeInTheDocument()
  })

  it('says so when no one matches', async () => {
    setup([])
    renderApp('/insights?country=SG')

    expect(await screen.findByText('No current salaries match these filters.')).toBeInTheDocument()
  })
})
