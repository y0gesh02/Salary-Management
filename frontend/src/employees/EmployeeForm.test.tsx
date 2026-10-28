import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EmployeeDetail } from '@/api/types'
import { setCsrfToken } from '@/lib/api'
import { fakeApi, type Routes } from '@/test/fake-api'
import { filterOptions } from '@/test/fixtures'
import { renderApp } from '@/test/render-app'

afterEach(() => {
  vi.unstubAllGlobals()
  setCsrfToken(null)
})

const salary = {
  id: 10, amount: '1800000.0', currency: 'INR', period: 'annual', annual_amount: '1800000.0',
  effective_date: '2024-03-01', status: 'current',
} as const

const priya: EmployeeDetail = {
  id: 1,
  full_name: 'Priya Sharma',
  email: 'priya@incubyte.example',
  job_title: 'Software Engineer',
  department: 'Engineering',
  country: { code: 'IN', name: 'India' },
  hire_date: '2024-03-01',
  current_salary: salary,
  salary_history: [salary],
}

function setup(routes: Routes = {}) {
  return fakeApi({
    'GET /api/session': { body: { user: { email: 'hr@incubyte.test' }, csrf_token: 'token-1' } },
    'GET /api/filters': { body: filterOptions },
    'GET /api/employees': { body: { data: [], meta: { page: 1, per_page: 25, total: 0 } } },
    'GET /api/employees/1': { body: priya },
    ...routes,
  })
}

async function fillProfile() {
  await userEvent.type(await screen.findByLabelText('Full name'), 'Priya Sharma')
  await userEvent.type(screen.getByLabelText('Email'), 'priya@incubyte.example')
  await userEvent.type(screen.getByLabelText('Job title'), 'Software Engineer')
  await userEvent.type(screen.getByLabelText('Department'), 'Engineering')
  await userEvent.type(screen.getByLabelText('Hire date'), '2024-03-01')
  await screen.findByRole('option', { name: 'India' })
}

describe('Adding an employee', () => {
  it('is reachable from the directory', async () => {
    setup()
    renderApp('/employees')

    expect(await screen.findByRole('link', { name: 'Add employee' })).toHaveAttribute('href', '/employees/new')
  })

  it('creates the employee with their first salary, then opens their page', async () => {
    const calls = setup({ 'POST /api/employees': { status: 201, body: priya } })
    const router = renderApp('/employees/new')

    await fillProfile()
    await userEvent.selectOptions(screen.getByLabelText('Country'), 'IN')
    await userEvent.type(screen.getByLabelText('Amount'), '1800000')
    await userEvent.click(screen.getByRole('button', { name: 'Add employee' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/employees/1'))
    expect(calls.find((call) => call.method === 'POST')?.body).toEqual({
      employee: {
        full_name: 'Priya Sharma', email: 'priya@incubyte.example', job_title: 'Software Engineer',
        department: 'Engineering', country_code: 'IN', hire_date: '2024-03-01',
        initial_salary: { amount: '1800000', currency: 'INR', period: 'annual' },
      },
    })
    expect(await screen.findByRole('heading', { name: 'Priya Sharma' })).toBeInTheDocument()
  })

  it("pre-selects the country's currency, but keeps a currency the HR manager picked", async () => {
    setup()
    renderApp('/employees/new')

    const country = await screen.findByLabelText('Country')
    await screen.findByRole('option', { name: 'United States' })
    const currency = screen.getByLabelText('Currency')
    await userEvent.selectOptions(country, 'US')
    expect(currency).toHaveValue('USD')

    await userEvent.selectOptions(currency, 'EUR')
    await userEvent.selectOptions(country, 'IN')
    expect(currency).toHaveValue('EUR')
  })

  it('shows profile and salary errors on their fields', async () => {
    setup({
      'POST /api/employees': {
        status: 422,
        body: { errors: { email: ['has already been taken'], 'initial_salary.amount': ['must be greater than 0'] } },
      },
    })
    const router = renderApp('/employees/new')

    await fillProfile()
    await userEvent.selectOptions(screen.getByLabelText('Country'), 'IN')
    await userEvent.type(screen.getByLabelText('Amount'), '0')
    await userEvent.click(screen.getByRole('button', { name: 'Add employee' }))

    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('has already been taken'))
    expect(screen.getByLabelText('Amount')).toHaveAccessibleDescription('must be greater than 0')
    expect(screen.getByLabelText('Full name')).not.toHaveAttribute('aria-invalid')
    expect(router.state.location.pathname).toBe('/employees/new')
  })
})

describe('Editing an employee', () => {
  it('is reachable from the employee page', async () => {
    setup()
    renderApp('/employees/1')

    expect(await screen.findByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/employees/1/edit')
  })

  it('updates the profile only (pay changes are recorded separately) and returns to the employee', async () => {
    const calls = setup({
      'PATCH /api/employees/1': ({ body }) => ({
        body: { ...priya, job_title: (body as { employee: { job_title: string } }).employee.job_title },
      }),
    })
    const router = renderApp('/employees/1/edit')

    const jobTitle = await screen.findByLabelText('Job title')
    await waitFor(() => expect(jobTitle).toHaveValue('Software Engineer'))
    expect(screen.getByLabelText('Country')).toHaveValue('IN')
    expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument()

    await userEvent.clear(jobTitle)
    await userEvent.type(jobTitle, 'Senior Software Engineer')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/employees/1'))
    expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({
      employee: {
        full_name: 'Priya Sharma', email: 'priya@incubyte.example', job_title: 'Senior Software Engineer',
        department: 'Engineering', country_code: 'IN', hire_date: '2024-03-01',
      },
    })
    expect(await screen.findByText('Senior Software Engineer · Engineering · India')).toBeInTheDocument()
  })

  it('shows errors on the fields and stays on the form', async () => {
    setup({
      'PATCH /api/employees/1': {
        status: 422, body: { errors: { hire_date: ["can't be after the first salary record (2024-03-01)"] } },
      },
    })
    const router = renderApp('/employees/1/edit')

    const hireDate = await screen.findByLabelText('Hire date')
    await waitFor(() => expect(hireDate).toHaveValue('2024-03-01'))
    await userEvent.clear(hireDate)
    await userEvent.type(hireDate, '2024-06-01')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(hireDate).toHaveAccessibleDescription("can't be after the first salary record (2024-03-01)"))
    expect(router.state.location.pathname).toBe('/employees/1/edit')
  })

  it('says so when the employee does not exist', async () => {
    setup()
    renderApp('/employees/999/edit')

    expect(await screen.findByText('Employee not found.')).toBeInTheDocument()
  })
})
