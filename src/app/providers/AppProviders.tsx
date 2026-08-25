import { type PropsWithChildren, useMemo } from 'react'

import { HandoverRepositoryProvider, HttpHandoverRepository, MockHandoverRepository } from '@/entities/handover'
import { AuthProvider, useAuth } from '@/features/auth'
import { CreateHandoverProvider } from '@/features/create-handover'
import { ToastProvider } from '@/shared/ui/toast'

const repository = new HttpHandoverRepository()

function AuthenticatedAppProviders({ children }: PropsWithChildren) {
  const { isDemo } = useAuth()
  const activeRepository = useMemo(
    () => isDemo ? new MockHandoverRepository({ scenarioOnly: true }) : repository,
    [isDemo],
  )

  return (
    <HandoverRepositoryProvider repository={activeRepository}>
      <CreateHandoverProvider key={isDemo ? 'scenario' : 'default'} useScenario={isDemo}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </CreateHandoverProvider>
    </HandoverRepositoryProvider>
  )
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      <AuthenticatedAppProviders>{children}</AuthenticatedAppProviders>
    </AuthProvider>
  )
}
