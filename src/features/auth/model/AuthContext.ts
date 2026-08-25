import { createContext } from 'react'

import type { User } from '@/entities/user'

import type { LoginInput } from '../api/authApi'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  sessionCheckFailed: boolean
  login: (input: LoginInput) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
