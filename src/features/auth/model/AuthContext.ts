import { createContext } from 'react'

import type { User } from '@/entities/user'

import type { LoginInput } from '../api/authApi'
import type { DemoRole } from './demoAuth'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  isDemo: boolean
  status: AuthStatus
  user: User | null
  sessionCheckFailed: boolean
  login: (input: LoginInput) => Promise<void>
  logout: () => Promise<void>
  startDemo: () => void
  switchDemoRole: (role: DemoRole) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
