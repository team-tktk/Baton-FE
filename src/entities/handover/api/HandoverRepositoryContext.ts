import { createContext } from 'react'

import type { HandoverRepository } from './HandoverRepository'

export const HandoverRepositoryContext = createContext<HandoverRepository | null>(null)
