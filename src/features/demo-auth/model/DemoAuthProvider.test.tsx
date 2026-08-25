import type { PropsWithChildren } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DemoAuthProvider } from './DemoAuthProvider'
import { useDemoAuth } from './useDemoAuth'

const wrapper = ({ children }: PropsWithChildren) => (
  <DemoAuthProvider>{children}</DemoAuthProvider>
)

describe('DemoAuthProvider', () => {
  it('logs in with the submitted email and resets on logout', () => {
    const { result } = renderHook(() => useDemoAuth(), { wrapper })

    act(() => result.current.login('new@moastore.co.kr'))
    expect(result.current.loggedIn).toBe(true)
    expect(result.current.user.email).toBe('new@moastore.co.kr')

    act(() => result.current.logout())
    expect(result.current.loggedIn).toBe(false)
    expect(result.current.user.name).toBe('정하늘')
  })

  it('uses signup profile values without accepting a password', () => {
    const { result } = renderHook(() => useDemoAuth(), { wrapper })

    act(() => result.current.signup({
      name: '김민준',
      email: 'minjun@moastore.co.kr',
      organization: '모아스토어',
      team: '상품팀',
    }))

    expect(result.current.user).toMatchObject({ name: '김민준', team: '상품팀' })
    expect(result.current.loggedIn).toBe(true)
    expect(result.current.user).not.toHaveProperty('password')
  })
})
