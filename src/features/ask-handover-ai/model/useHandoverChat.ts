import { useCallback, useReducer, useRef } from 'react'

import { useHandoverRepository } from '@/entities/handover'

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  text: string
  source?: string | null
}

type ChatStatus = 'idle' | 'sending' | 'error'
interface State { messages: ChatMessage[]; status: ChatStatus }
type Action = { type: 'user'; message: ChatMessage } | { type: 'answer'; message: ChatMessage } | { type: 'error' }

const initialState: State = { messages: [{ id: 'assistant-greeting', role: 'assistant', text: '인수인계에서 궁금한 내용을 물어보세요. 자료를 바탕으로 답해드릴게요.' }], status: 'idle' }
export const AI_RESPONSE_DELAY_MS = 1_200
const waitForResponse = () => new Promise<void>((resolve) => setTimeout(resolve, AI_RESPONSE_DELAY_MS))
function reducer(state: State, action: Action): State {
  if (action.type === 'user') return { messages: [...state.messages, action.message], status: 'sending' }
  if (action.type === 'answer') return { messages: [...state.messages, action.message], status: 'idle' }
  return { ...state, status: 'error' }
}

export function useHandoverChat(handoverId: string) {
  const repository = useHandoverRepository()
  const [state, dispatch] = useReducer(reducer, initialState)
  const pendingRef = useRef(false)
  const sequenceRef = useRef(0)

  const send = useCallback(async (question: string) => {
    const value = question.trim()
    if (!value || pendingRef.current) return false
    pendingRef.current = true
    sequenceRef.current += 1
    const sequence = sequenceRef.current
    dispatch({ type: 'user', message: { id: `user-${sequence}`, role: 'user', text: value } })
    try {
      const [answer] = await Promise.all([
        repository.askQuestion(handoverId, value),
        waitForResponse(),
      ])
      dispatch({ type: 'answer', message: { id: `assistant-${sequence}`, role: 'assistant', text: answer.text, source: answer.source } })
      return true
    } catch {
      dispatch({ type: 'error' })
      return false
    } finally {
      pendingRef.current = false
    }
  }, [handoverId, repository])

  return { messages: state.messages, send, status: state.status }
}
