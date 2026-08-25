import { type PropsWithChildren, useMemo, useReducer } from 'react'

import { CreateHandoverContext } from './CreateHandoverContext'
import { createHandoverReducer, createInitialCreateHandoverState } from './createHandoverReducer'

export function CreateHandoverProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(createHandoverReducer, undefined, createInitialCreateHandoverState)
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <CreateHandoverContext value={value}>{children}</CreateHandoverContext>
}
