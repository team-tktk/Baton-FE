import type { PropsWithChildren } from 'react'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'
import { AuthProvider } from '@/features/auth'
import { CreateHandoverProvider } from '@/features/create-handover'
import { ToastProvider } from '@/shared/ui/toast'

const repository = new MockHandoverRepository()

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <HandoverRepositoryProvider repository={repository}>
      <AuthProvider>
        <CreateHandoverProvider>
          <ToastProvider>{children}</ToastProvider>
        </CreateHandoverProvider>
      </AuthProvider>
    </HandoverRepositoryProvider>
  )
}
