import { useContext } from 'react'

import { CreateHandoverContext } from './CreateHandoverContext'

export function useCreateHandover() {
  const value = useContext(CreateHandoverContext)
  if (!value) throw new Error('CreateHandoverProvider is missing')
  return value
}
