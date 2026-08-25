import { type PropsWithChildren, useMemo, useReducer } from 'react'

import { CreateHandoverContext } from './CreateHandoverContext'
import { createHandoverReducer, createInitialCreateHandoverState } from './createHandoverReducer'

interface CreateHandoverProviderProps extends PropsWithChildren {
  useScenario?: boolean
}

export function CreateHandoverProvider({ children, useScenario = false }: CreateHandoverProviderProps) {
  const [state, dispatch] = useReducer(createHandoverReducer, useScenario, createInitialCreateHandoverState)
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <CreateHandoverContext value={value}>{children}</CreateHandoverContext>
}
