import type { PropsWithChildren } from 'react'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'
import { DemoAuthProvider } from '@/features/demo-auth'
import { ToastProvider } from '@/shared/ui/toast'

const repository = new MockHandoverRepository()

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <HandoverRepositoryProvider repository={repository}>
      <DemoAuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </DemoAuthProvider>
    </HandoverRepositoryProvider>
  )
}
