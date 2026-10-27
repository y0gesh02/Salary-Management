import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeApi } from '@/test/fake-api'
import { api, ApiError, setCsrfToken, toQueryString } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
  setCsrfToken(null)
})

describe('api', () => {
  it('sends JSON with the CSRF token on state-changing requests', async () => {
    const calls = fakeApi({ 'POST /api/employees': { status: 201, body: { id: 1 } } })
    setCsrfToken('token-123')

    await expect(api.post('/employees', { full_name: 'Priya' })).resolves.toEqual({ id: 1 })

    expect(calls[0].headers).toMatchObject({ 'Content-Type': 'application/json', 'X-CSRF-Token': 'token-123' })
    expect(calls[0].body).toEqual({ full_name: 'Priya' })
  })

  it('does not attach the CSRF token to reads', async () => {
    const calls = fakeApi({ 'GET /api/employees': { body: { data: [] } } })
    setCsrfToken('token-123')

    await api.get('/employees', { q: 'priya', page: 2 })

    expect(calls[0].headers['X-CSRF-Token']).toBeUndefined()
    expect(calls[0].url.search).toBe('?q=priya&page=2')
  })

  it('turns 422 responses into field errors the forms can show', async () => {
    fakeApi({ 'POST /api/employees': { status: 422, body: { errors: { email: ['is invalid'] } } } })

    const error = await api.post('/employees', {}).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 422, fieldErrors: { email: ['is invalid'] } })
  })

  it("uses the server's error message when there is one", async () => {
    fakeApi({ 'POST /api/session': { status: 401, body: { error: 'Invalid email or password' } } })

    await expect(api.post('/session', {})).rejects.toThrow('Invalid email or password')
  })

  it('resolves to nothing for 204 No Content', async () => {
    fakeApi({ 'DELETE /api/employees/1': { status: 204 } })

    await expect(api.delete('/employees/1')).resolves.toBeUndefined()
  })
})

describe('toQueryString', () => {
  it('leaves out empty values', () => {
    expect(toQueryString({ q: '', country: 'IN', department: undefined, page: 1, sort: null })).toBe('?country=IN&page=1')
  })

  it('is empty when there is nothing to send', () => {
    expect(toQueryString({ q: '' })).toBe('')
  })
})
