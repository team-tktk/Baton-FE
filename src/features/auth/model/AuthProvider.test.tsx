import type { PropsWithChildren } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from './AuthProvider'
import { DEMO_ROLE_KEY, DEMO_SESSION_KEY, demoUser, demoUsers } from './demoAuth'
import { useAuth } from './useAuth'

const authenticatedUser = {
  createdAt: '2026-08-25T12:00:00Z',
  email: 'haneul@moastore.co.kr',
  id: 'f22d04eb-e4f9-4899-953a-86ad86f00dd3',
  name: '정하늘',
  position: '매니저',
  team: '운영팀',
}

const wrapper = ({ children }: PropsWithChildren) => <AuthProvider>{children}</AuthProvider>

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}

afterEach(() => {
  sessionStorage.clear()
  vi.unstubAllGlobals()
})

describe('AuthProvider', () => {
  it('restores an authenticated user from the current session', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(authenticatedUser)))

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('authenticated'))
    expect(result.current.user).toEqual(authenticatedUser)
    expect(result.current.sessionCheckFailed).toBe(false)
  })

  it('becomes anonymous when no authenticated session exists', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, 401)))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('anonymous'))
    expect(result.current.user).toBeNull()
    expect(result.current.sessionCheckFailed).toBe(false)
  })

  it('records a retryable session check failure without blocking the app', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ message: 'Server error' }, 500)))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('anonymous'))
    expect(result.current.sessionCheckFailed).toBe(true)
  })

  it('stores the returned user after login', async () => {
    const fetchSpy = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(jsonResponse(authenticatedUser))
    vi.stubGlobal('fetch', fetchSpy)
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('anonymous'))

    await act(() => result.current.login({ email: authenticatedUser.email, password: 'secret' }))

    expect(result.current.status).toBe('authenticated')
    expect(result.current.user).toEqual(authenticatedUser)
    expect(result.current.sessionCheckFailed).toBe(false)
  })

  it('clears the user after successful logout', async () => {
    const fetchSpy = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(authenticatedUser))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchSpy)
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('authenticated'))

    await act(() => result.current.logout())

    expect(result.current.status).toBe('anonymous')
    expect(result.current.user).toBeNull()
  })

  it('keeps the authenticated user when logout fails', async () => {
    const fetchSpy = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(authenticatedUser))
      .mockResolvedValueOnce(jsonResponse({ message: 'Server error' }, 500))
    vi.stubGlobal('fetch', fetchSpy)
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('authenticated'))

    await expect(act(() => result.current.logout())).rejects.toMatchObject({ status: 500 })

    expect(result.current.status).toBe('authenticated')
    expect(result.current.user).toEqual(authenticatedUser)
  })

  it('starts and ends a demo session without calling the auth API', async () => {
    const fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, 401))
    vi.stubGlobal('fetch', fetchSpy)
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('anonymous'))

    act(() => result.current.startDemo())

    expect(result.current.isDemo).toBe(true)
    expect(result.current.user).toEqual(demoUser)
    expect(sessionStorage.getItem(DEMO_SESSION_KEY)).toBe('active')
    expect(sessionStorage.getItem(DEMO_ROLE_KEY)).toBe('owner')

    act(() => result.current.switchDemoRole('recipient'))
    expect(result.current.user).toEqual(demoUsers.recipient)
    expect(sessionStorage.getItem(DEMO_ROLE_KEY)).toBe('recipient')

    await act(() => result.current.logout())

    expect(result.current.status).toBe('anonymous')
    expect(result.current.isDemo).toBe(false)
    expect(sessionStorage.getItem(DEMO_ROLE_KEY)).toBeNull()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('restores demo mode on refresh without checking the backend session', async () => {
    sessionStorage.setItem(DEMO_SESSION_KEY, 'active')
    sessionStorage.setItem(DEMO_ROLE_KEY, 'reviewer')
    const fetchSpy = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('authenticated'))
    expect(result.current.isDemo).toBe(true)
    expect(result.current.user).toEqual(demoUsers.reviewer)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
