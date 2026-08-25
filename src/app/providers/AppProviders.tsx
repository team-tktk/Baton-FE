import type { PropsWithChildren } from 'react'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'
import { DemoAuthProvider } from '@/features/demo-auth'
import { CreateHandoverProvider } from '@/features/create-handover'
import { ToastProvider } from '@/shared/ui/toast'

const repository = new MockHandoverRepository()

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <HandoverRepositoryProvider repository={repository}>
      <DemoAuthProvider>
        <CreateHandoverProvider>
          <ToastProvider>{children}</ToastProvider>
        </CreateHandoverProvider>
      </DemoAuthProvider>
    </HandoverRepositoryProvider>
  )
}
