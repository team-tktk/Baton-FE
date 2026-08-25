import type { PropsWithChildren } from 'react'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'
import { ToastProvider } from '@/shared/ui/toast'

const repository = new MockHandoverRepository()

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <HandoverRepositoryProvider repository={repository}>
      <ToastProvider>{children}</ToastProvider>
    </HandoverRepositoryProvider>
  )
}
