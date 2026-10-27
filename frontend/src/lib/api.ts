// Thin JSON client for the Rails API. It speaks the API's contract:
//   - session cookie auth (same origin), CSRF token on every non-GET request
//   - errors as { error: "..." } or, for invalid input, 422 { errors: { field: [...] } }

export type FieldErrors = Record<string, string[]>

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: FieldErrors

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

// Rails rotates the token on login/logout; the session hooks keep this current.
let csrfToken: string | null = null

export function setCsrfToken(token: string | null) {
  csrfToken = token
}

export type QueryParams = Record<string, string | number | null | undefined>

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

const FALLBACK_MESSAGES: Record<number, string> = {
  401: 'Please log in again.',
  404: 'Not found.',
  422: 'Please fix the highlighted fields.',
}

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data?.error ?? FALLBACK_MESSAGES[response.status] ?? 'Something went wrong. Please try again.'
    throw new ApiError(response.status, message, data?.errors ?? {})
  }
  return data as T
}

// Builds "?a=1&b=x", leaving out empty values so URLs stay clean.
export function toQueryString(params: QueryParams = {}): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const api = {
  get: <T>(path: string, params?: QueryParams) => request<T>('GET', `${path}${toQueryString(params)}`),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
}
