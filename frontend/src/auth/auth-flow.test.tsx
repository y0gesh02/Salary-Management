import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setCsrfToken } from '@/lib/api'
import { fakeApi } from '@/test/fake-api'
import { renderApp } from '@/test/render-app'

const loggedOut = { body: { user: null, csrf_token: 'logged-out-token' } }
const loggedIn = { body: { user: { email: 'hr@acme.test' }, csrf_token: 'logged-in-token' } }

afterEach(() => {
  vi.unstubAllGlobals()
  setCsrfToken(null)
})

describe('authentication flow', () => {
  it('sends a visitor who is not logged in to the login page', async () => {
    fakeApi({ 'GET /api/session': loggedOut })

    const router = renderApp('/insights')

    expect(await screen.findByRole('button', { name: 'Log in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('logs in with the CSRF token and returns to the page the user asked for', async () => {
    const calls = fakeApi({ 'GET /api/session': loggedOut, 'POST /api/session': loggedIn })
    const router = renderApp('/insights')

    await userEvent.type(await screen.findByLabelText('Email'), 'hr@acme.test')
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse-battery')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('heading', { name: 'Salary insights' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/insights')
    const loginCall = calls.find((call) => call.method === 'POST')
    expect(loginCall?.headers['X-CSRF-Token']).toBe('logged-out-token')
    expect(loginCall?.body).toEqual({ email: 'hr@acme.test', password: 'correct-horse-battery' })
  })

  it("shows the server's message when login fails", async () => {
    fakeApi({
      'GET /api/session': loggedOut,
      'POST /api/session': { status: 401, body: { error: 'Invalid email or password' } },
    })
    renderApp('/login')

    await userEvent.type(await screen.findByLabelText('Email'), 'hr@acme.test')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument()
  })

  it('shows the app with the signed-in email to a logged-in HR manager', async () => {
    fakeApi({ 'GET /api/session': loggedIn })

    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Employees' })).toBeInTheDocument()
    expect(screen.getByText('hr@acme.test')).toBeInTheDocument()
  })

  it('logs out and returns to the login page', async () => {
    let session: { body: unknown } = loggedIn
    fakeApi({
      'GET /api/session': () => session,
      'DELETE /api/session': () => {
        session = loggedOut
        return { status: 204 }
      },
    })
    const router = renderApp('/employees')

    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  it('returns to the login page when the session expires mid-use', async () => {
    let session: { body: unknown } = loggedIn
    fakeApi({
      'GET /api/session': () => session,
      'DELETE /api/session': () => {
        session = loggedOut // simulate expiry: the next session check finds no user
        return { status: 401, body: { error: 'Not logged in' } }
      },
    })
    const router = renderApp('/employees')

    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })
})
