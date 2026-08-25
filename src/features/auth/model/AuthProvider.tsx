import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react'

import type { User } from '@/entities/user'
import { ApiError } from '@/shared/api'

import { authApi, type LoginInput } from '../api/authApi'
import { AuthContext, type AuthStatus } from './AuthContext'

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false)

  useEffect(() => {
    let active = true

    authApi.getCurrentUser()
      .then((currentUser) => {
        if (!active) return
        setUser(currentUser)
        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        if (!active) return
        setUser(null)
        setSessionCheckFailed(!(error instanceof ApiError && error.status === 401))
        setStatus('anonymous')
      })

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const authenticatedUser = await authApi.login(input)
    setUser(authenticatedUser)
    setSessionCheckFailed(false)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo(() => ({
    login,
    logout,
    sessionCheckFailed,
    status,
    user,
  }), [login, logout, sessionCheckFailed, status, user])

  return <AuthContext value={value}>{children}</AuthContext>
}
