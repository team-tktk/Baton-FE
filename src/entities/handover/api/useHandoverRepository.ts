import { useContext } from 'react'

import { HandoverRepositoryContext } from './HandoverRepositoryContext'

export function useHandoverRepository() {
  const repository = useContext(HandoverRepositoryContext)
  if (!repository) throw new Error('HandoverRepositoryProvider is missing')
  return repository
}
