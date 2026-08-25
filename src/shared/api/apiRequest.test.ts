import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiRequest } from './index'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiRequest', () => {
  it('sends JSON requests with session credentials and preserves custom headers', async () => {
    const fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }))
    vi.stubGlobal('fetch', fetchSpy)

    const result = await apiRequest<{ ok: boolean }>('/api/example', {
      body: JSON.stringify({ name: 'BATON' }),
      headers: { 'X-Request-Source': 'test' },
      method: 'POST',
    })

    expect(result).toEqual({ ok: true })
    const [, init] = fetchSpy.mock.calls[0]
    const headers = new Headers(init?.headers)
    expect(init?.credentials).toBe('include')
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('X-Request-Source')).toBe('test')
  })

  it('returns undefined for a successful response without content', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 })))

    await expect(apiRequest<void>('/api/logout', { method: 'POST' })).resolves.toBeUndefined()
  })

  it('turns an HTTP failure into an ApiError with its status', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ message: 'Unauthorized' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 401,
    })))

    await expect(apiRequest('/api/me')).rejects.toMatchObject({
      code: 'http',
      message: 'Unauthorized',
      status: 401,
    })
  })

  it('uses a safe message when an error response is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('upstream failed', { status: 502 })))

    await expect(apiRequest('/api/me')).rejects.toEqual(expect.objectContaining({
      code: 'http',
      message: '요청을 처리하지 못했어요.',
      status: 502,
    }))
  })

  it('turns fetch rejection into a network ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')))

    const error = await apiRequest('/api/me').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: 'network', status: null })
  })

  it('rejects absolute URLs before making a request', async () => {
    const fetchSpy = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchSpy)

    await expect(apiRequest('http://example.com/api/me')).rejects.toMatchObject({
      code: 'invalid-response',
      status: null,
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
