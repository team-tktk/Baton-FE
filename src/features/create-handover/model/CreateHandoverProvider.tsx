import { type PropsWithChildren, useMemo, useReducer } from 'react'

import { CreateHandoverContext } from './CreateHandoverContext'
import { createHandoverReducer, createInitialCreateHandoverState, type CreateHandoverState } from './createHandoverReducer'

export function CreateHandoverProvider({ children, initialState }: PropsWithChildren<{ initialState?: CreateHandoverState }>) {
  const [state, dispatch] = useReducer(createHandoverReducer, initialState, (value) => value ?? createInitialCreateHandoverState())
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <CreateHandoverContext value={value}>{children}</CreateHandoverContext>
}
