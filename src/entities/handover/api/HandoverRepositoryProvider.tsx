import type { PropsWithChildren } from 'react'

import type { HandoverRepository } from './HandoverRepository'
import { HandoverRepositoryContext } from './HandoverRepositoryContext'

interface HandoverRepositoryProviderProps extends PropsWithChildren {
  repository: HandoverRepository
}

export function HandoverRepositoryProvider({
  children,
  repository,
}: HandoverRepositoryProviderProps) {
  return (
    <HandoverRepositoryContext value={repository}>
      {children}
    </HandoverRepositoryContext>
  )
}
