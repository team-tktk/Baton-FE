import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react'

import type { User } from '@/entities/user'
import { ApiError } from '@/shared/api'

import { authApi, type LoginInput } from '../api/authApi'
import { AuthContext, type AuthStatus } from './AuthContext'
import { DEMO_ROLE_KEY, DEMO_SESSION_KEY, demoUsers, type DemoRole } from './demoAuth'

const getStoredDemoRole = (): DemoRole => {
  const role = sessionStorage.getItem(DEMO_ROLE_KEY)
  return role === 'recipient' || role === 'reviewer' ? role : 'owner'
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [restoredDemo] = useState(() => sessionStorage.getItem(DEMO_SESSION_KEY) === 'active')
  const [status, setStatus] = useState<AuthStatus>(restoredDemo ? 'authenticated' : 'loading')
  const [user, setUser] = useState<User | null>(restoredDemo ? demoUsers[getStoredDemoRole()] : null)
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false)
  const [isDemo, setIsDemo] = useState(restoredDemo)

  useEffect(() => {
    let active = true

    if (restoredDemo) return () => { active = false }

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
  }, [restoredDemo])

  const login = useCallback(async (input: LoginInput) => {
    const authenticatedUser = await authApi.login(input)
    sessionStorage.removeItem(DEMO_SESSION_KEY)
    sessionStorage.removeItem(DEMO_ROLE_KEY)
    setIsDemo(false)
    setUser(authenticatedUser)
    setSessionCheckFailed(false)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    if (isDemo) {
      sessionStorage.removeItem(DEMO_SESSION_KEY)
      sessionStorage.removeItem(DEMO_ROLE_KEY)
      setIsDemo(false)
    } else {
      await authApi.logout()
    }
    setUser(null)
    setStatus('anonymous')
  }, [isDemo])

  const startDemo = useCallback(() => {
    sessionStorage.setItem(DEMO_SESSION_KEY, 'active')
    sessionStorage.setItem(DEMO_ROLE_KEY, 'owner')
    setIsDemo(true)
    setSessionCheckFailed(false)
    setUser(demoUsers.owner)
    setStatus('authenticated')
  }, [])

  const switchDemoRole = useCallback((role: DemoRole) => {
    if (!isDemo) return
    sessionStorage.setItem(DEMO_ROLE_KEY, role)
    setUser(demoUsers[role])
  }, [isDemo])

  const value = useMemo(() => ({
    isDemo,
    login,
    logout,
    sessionCheckFailed,
    startDemo,
    status,
    switchDemoRole,
    user,
  }), [isDemo, login, logout, sessionCheckFailed, startDemo, status, switchDemoRole, user])

  return <AuthContext value={value}>{children}</AuthContext>
}
