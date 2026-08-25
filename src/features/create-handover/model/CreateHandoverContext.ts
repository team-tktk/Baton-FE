import { createContext, type Dispatch } from 'react'

import type { CreateHandoverAction, CreateHandoverState } from './createHandoverReducer'

export interface CreateHandoverContextValue {
  state: CreateHandoverState
  dispatch: Dispatch<CreateHandoverAction>
}

export const CreateHandoverContext = createContext<CreateHandoverContextValue | null>(null)
