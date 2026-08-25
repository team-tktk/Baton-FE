import { type PropsWithChildren, useMemo, useState } from 'react'

import type { User } from '@/entities/user'

import { DemoAuthContext, type SignupInput } from './DemoAuthContext'

const defaultUser: User = {
  id: 'user-jung-haneul',
  name: '정하늘',
  email: 'haneul@moastore.co.kr',
  organization: '모아스토어',
  team: '운영팀',
  role: 'successor',
}

export function DemoAuthProvider({ children }: PropsWithChildren) {
  const [loggedIn, setLoggedIn] = useState(false)
  const [user, setUser] = useState(defaultUser)

  const value = useMemo(() => ({
    loggedIn,
    user,
    login(email: string) {
      setUser((current) => ({ ...current, email: email.trim() }))
      setLoggedIn(true)
    },
    signup(input: SignupInput) {
      setUser({
        id: 'user-jung-haneul',
        name: input.name.trim(),
        email: input.email.trim(),
        organization: input.organization.trim(),
        team: input.team.trim(),
        role: 'successor',
      })
      setLoggedIn(true)
    },
    logout() {
      setLoggedIn(false)
    },
  }), [loggedIn, user])

  return <DemoAuthContext value={value}>{children}</DemoAuthContext>
}
