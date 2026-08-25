import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiRequest } from './index'

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
})

function okFetchSpy() {
  const fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  }))
  vi.stubGlobal('fetch', fetchSpy)
  return fetchSpy
}

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

  it('reads the detail from a Problem Details response', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      code: 'AUTH_REQUIRED',
      detail: '로그인이 필요합니다',
      status: 401,
      title: '로그인이 필요합니다',
    }), {
      headers: { 'Content-Type': 'application/problem+json' },
      status: 401,
    })))

    await expect(apiRequest('/api/v1/auth/me')).rejects.toMatchObject({
      code: 'http',
      message: '로그인이 필요합니다',
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

  it('sends the XSRF cookie as a CSRF header on state-changing requests', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-token-value'
    const fetchSpy = okFetchSpy()

    await apiRequest('/api/v1/auth/login', { body: '{}', method: 'POST' })

    const [, init] = fetchSpy.mock.calls[0]
    expect(new Headers(init?.headers).get('X-XSRF-TOKEN')).toBe('csrf-token-value')
  })

  it('omits the CSRF header on safe methods and when the cookie is missing', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-token-value'
    const readSpy = okFetchSpy()
    await apiRequest('/api/v1/auth/me')
    expect(new Headers(readSpy.mock.calls[0][1]?.headers).get('X-XSRF-TOKEN')).toBeNull()

    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    const writeSpy = okFetchSpy()
    await apiRequest('/api/v1/auth/logout', { method: 'POST' })
    expect(new Headers(writeSpy.mock.calls[0][1]?.headers).get('X-XSRF-TOKEN')).toBeNull()
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
