import { useContext } from 'react'

import { DemoAuthContext } from './DemoAuthContext'

export function useDemoAuth() {
  const value = useContext(DemoAuthContext)
  if (!value) throw new Error('DemoAuthProvider is missing')
  return value
}
