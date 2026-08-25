import { afterEach, describe, expect, it, vi } from 'vitest'

import { authApi } from './authApi'

const signupInput = {
  email: 'new-user@moastore.co.kr',
  name: '김민준',
  password: 'password123',
  position: '매니저',
  team: '상품팀',
}

const signupUser = {
  createdAt: '2026-08-25T12:00:00Z',
  email: signupInput.email,
  id: 'f22d04eb-e4f9-4899-953a-86ad86f00dd3',
  name: signupInput.name,
  position: signupInput.position,
  team: signupInput.team,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('authApi.signup', () => {
  it('registers all required profile fields through the signup endpoint', async () => {
    const fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(signupUser), {
      headers: { 'Content-Type': 'application/json' },
      status: 201,
    }))
    vi.stubGlobal('fetch', fetchSpy)

    await expect(authApi.signup(signupInput)).resolves.toEqual(signupUser)

    const [path, init] = fetchSpy.mock.calls[0]
    expect(path).toBe('/api/v1/auth/signup')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual(signupInput)
  })
})
