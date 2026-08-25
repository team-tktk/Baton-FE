import { createContext } from 'react'

import type { User } from '@/entities/user'

export interface SignupInput {
  name: string
  email: string
  organization: string
  team: string
}

export interface DemoAuthContextValue {
  loggedIn: boolean
  user: User
  login: (email: string) => void
  signup: (input: SignupInput) => void
  logout: () => void
}

export const DemoAuthContext = createContext<DemoAuthContextValue | null>(null)
