import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EmployeeDetail, SalaryRecord } from '@/api/types'
import { setCsrfToken } from '@/lib/api'
import { fakeApi, type Routes } from '@/test/fake-api'
import { filterOptions } from '@/test/fixtures'
import { renderApp } from '@/test/render-app'

afterEach(() => {
  vi.unstubAllGlobals()
  setCsrfToken(null)
})

const record = (overrides: Partial<SalaryRecord>): SalaryRecord => ({
  id: 1, amount: '1500000.0', currency: 'INR', period: 'annual', annual_amount: '1500000.0',
  effective_date: '2022-01-10', status: 'past', ...overrides,
})

const raise = record({
  id: 2, amount: '150000.0', period: 'monthly', annual_amount: '1800000.0', effective_date: '2024-04-01', status: 'current',
})
const scheduled = record({
  id: 3, amount: '2000000.0', annual_amount: '2000000.0', effective_date: '2027-04-01', status: 'scheduled',
})

const priya: EmployeeDetail = {
  id: 1,
  full_name: 'Priya Sharma',
  email: 'priya@acme.example',
  job_title: 'Software Engineer',
  department: 'Engineering',
  country: { code: 'IN', name: 'India' },
  hire_date: '2022-01-10',
  current_salary: raise,
  salary_history: [scheduled, raise, record({})],
}


function setup(routes: Routes = {}, employee: EmployeeDetail = priya) {
  return fakeApi({
    'GET /api/session': { body: { user: { email: 'hr@acme.test' }, csrf_token: 'token-1' } },
    'GET /api/filters': { body: filterOptions },
    'GET /api/employees': { body: { data: [], meta: { page: 1, per_page: 25, total: 0 } } },
    [`GET /api/employees/${employee.id}`]: { body: employee },
    ...routes,
  })
}

describe('Employee page', () => {
  it('shows the profile and the salary in effect, in its own currency', async () => {
    setup()
    renderApp('/employees/1')

    expect(await screen.findByRole('heading', { name: 'Priya Sharma' })).toBeInTheDocument()
    expect(screen.getByText('Software Engineer · Engineering · India')).toBeInTheDocument()
    expect(screen.getByText('priya@acme.example')).toBeInTheDocument()

    const current = screen.getByRole('region', { name: 'Current salary' })
    expect(within(current).getByText('INR 1,800,000 / year')).toBeInTheDocument()
    expect(within(current).getByText('paid INR 150,000 / month')).toBeInTheDocument()
    expect(within(current).getByText('Since 2024-04-01')).toBeInTheDocument()
  })

  it('lists the whole pay history newest first, labelled past, current or scheduled', async () => {
    setup()
    renderApp('/employees/1')

    const history = await screen.findByRole('table', { name: 'Salary history' })
    const rows = within(history).getAllByRole('row').slice(1)
    expect(rows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual([
      '2027-04-01', '2024-04-01', '2022-01-10',
    ])
    expect(rows.map((row) => within(row).getByTestId('status').textContent)).toEqual(['Scheduled', 'Current', 'Past'])
    expect(within(rows[1]).getByText('INR 150,000 / month')).toBeInTheDocument()
  })

  it('explains when no salary is in effect yet, and shows the next scheduled one', async () => {
    const later = record({ id: 5, amount: '2500000.0', annual_amount: '2500000.0', effective_date: '2028-04-01', status: 'scheduled' })
    setup({}, { ...priya, current_salary: null, salary_history: [later, scheduled] })
    renderApp('/employees/1')

    const current = await screen.findByRole('region', { name: 'Current salary' })
    expect(within(current).getByText('No salary in effect yet.')).toBeInTheDocument()
    expect(within(current).getByText('INR 2,000,000 / year starts on 2027-04-01')).toBeInTheDocument()
  })

  it('records a salary change and shows the updated history', async () => {
    const newRecord = record({ id: 4, amount: '1950000.0', annual_amount: '1950000.0', effective_date: '2026-11-01', status: 'current' })
    const calls = setup({
      'POST /api/employees/1/salary_records': {
        status: 201,
        body: { ...priya, current_salary: newRecord, salary_history: [scheduled, newRecord, { ...raise, status: 'past' }, record({})] },
      },
    })
    renderApp('/employees/1')

    await userEvent.click(await screen.findByRole('button', { name: 'Record salary change' }))
    const dialog = screen.getByRole('dialog', { name: 'Record salary change' })
    // Pre-filled from the salary in effect, so a raise only needs the new amount and date.
    expect(within(dialog).getByLabelText('Currency')).toHaveValue('INR')
    expect(within(dialog).getByLabelText('Pay period')).toHaveValue('monthly')

    await userEvent.selectOptions(within(dialog).getByLabelText('Pay period'), 'annual')
    await userEvent.type(within(dialog).getByLabelText('Amount'), '1950000')
    await userEvent.clear(within(dialog).getByLabelText('Effective date'))
    await userEvent.type(within(dialog).getByLabelText('Effective date'), '2026-11-01')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const post = calls.find((call) => call.method === 'POST')!
    expect(post.body).toEqual({
      salary_record: { amount: '1950000', currency: 'INR', period: 'annual', effective_date: '2026-11-01' },
    })
    expect(post.headers['X-CSRF-Token']).toBe('token-1')
    const current = screen.getByRole('region', { name: 'Current salary' })
    expect(within(current).getByText('INR 1,950,000 / year')).toBeInTheDocument()
  })

  it('shows validation errors next to the fields they belong to and keeps the dialog open', async () => {
    setup({
      'POST /api/employees/1/salary_records': {
        status: 422,
        body: { errors: { amount: ['must be greater than 0'], effective_date: ["can't be before the hire date (2022-01-10)"] } },
      },
    })
    renderApp('/employees/1')

    await userEvent.click(await screen.findByRole('button', { name: 'Record salary change' }))
    const dialog = screen.getByRole('dialog', { name: 'Record salary change' })
    await userEvent.type(within(dialog).getByLabelText('Amount'), '0')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(within(dialog).getByLabelText('Amount')).toHaveAccessibleDescription('must be greater than 0'))
    expect(within(dialog).getByLabelText('Amount')).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByLabelText('Effective date'))
      .toHaveAccessibleDescription("can't be before the hire date (2022-01-10)")
    expect(within(dialog).getByLabelText('Currency')).not.toHaveAttribute('aria-invalid')
  })

  it('deletes the employee only after confirmation, then returns to the directory', async () => {
    const calls = setup({ 'DELETE /api/employees/1': { status: 204 } })
    const router = renderApp('/employees/1')

    await userEvent.click(await screen.findByRole('button', { name: 'Delete employee' }))
    const confirm = screen.getByRole('alertdialog', { name: 'Delete Priya Sharma?' })
    expect(within(confirm).getByText(/salary history will be deleted too/)).toBeInTheDocument()
    await userEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }))
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: 'Delete employee' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/employees'))
    expect(calls.filter((call) => call.method === 'DELETE').map((call) => call.url.pathname)).toEqual(['/api/employees/1'])
  })

  it('says so when the employee does not exist', async () => {
    setup()
    renderApp('/employees/999')

    expect(await screen.findByText('Employee not found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to employees' })).toHaveAttribute('href', '/employees')
  })
})
