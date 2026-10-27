import { vi } from 'vitest'

type Reply = { status?: number; body?: unknown }
type Handler = (request: { body: unknown; headers: Record<string, string>; url: URL }) => Reply
export type Routes = Record<string, Handler | Reply>

// Stubs global fetch with handlers keyed "METHOD /api/path" (query string ignored).
// Returns the recorded calls so tests can assert on what was sent.
export function fakeApi(routes: Routes) {
  const calls: { method: string; url: URL; headers: Record<string, string>; body: unknown }[] = []

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost')
    const method = init.method ?? 'GET'
    const headers = (init.headers ?? {}) as Record<string, string>
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ method, url, headers, body })

    const route = routes[`${method} ${url.pathname}`]
    if (!route) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

    const reply = typeof route === 'function' ? route({ body, headers, url }) : route
    const status = reply.status ?? 200
    return new Response(status === 204 ? null : JSON.stringify(reply.body ?? {}), { status })
  })

  vi.stubGlobal('fetch', fetchMock)
  return calls
}
