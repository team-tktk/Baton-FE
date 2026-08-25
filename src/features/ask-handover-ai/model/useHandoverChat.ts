import { useCallback, useEffect, useReducer, useRef } from 'react'

import type { HandoverAnswerCitation } from '@/entities/handover'
import { useHandoverRepository } from '@/entities/handover'

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  text: string
  citations?: HandoverAnswerCitation[]
}

type ChatStatus = 'idle' | 'sending' | 'error'
interface State { messages: ChatMessage[]; status: ChatStatus }
type Action =
  | { type: 'user'; message: ChatMessage }
  | { type: 'answer'; message: ChatMessage }
  | { type: 'history'; messages: ChatMessage[] }
  | { type: 'error' }

const initialState: State = { messages: [{ id: 'assistant-greeting', role: 'assistant', text: '인수인계에서 궁금한 내용을 물어보세요. 자료를 바탕으로 답해드릴게요.' }], status: 'idle' }
function reducer(state: State, action: Action): State {
  if (action.type === 'user') return { messages: [...state.messages, action.message], status: 'sending' }
  if (action.type === 'answer') return { messages: [...state.messages, action.message], status: 'idle' }
  // 이전 대화는 인사말 뒤에 끼운다. 이력이 늦게 도착해도 그사이 보낸 질문과 전송 상태는 그대로 둔다.
  if (action.type === 'history') {
    const greeting = state.messages.slice(0, initialState.messages.length)
    const added = state.messages.slice(initialState.messages.length)
    return { ...state, messages: [...greeting, ...action.messages, ...added] }
  }
  return { ...state, status: 'error' }
}

export function useHandoverChat(handoverId: string) {
  const repository = useHandoverRepository()
  const [state, dispatch] = useReducer(reducer, initialState)
  const pendingRef = useRef(false)
  const sequenceRef = useRef(0)

  useEffect(() => {
    let ignore = false
    repository.listChatMessages(handoverId)
      .then((exchanges) => {
        if (ignore || exchanges.length === 0) return
        dispatch({ type: 'history', messages: exchanges.flatMap((exchange) => [
          { id: `${exchange.id}-question`, role: 'user' as const, text: exchange.question },
          { id: `${exchange.id}-answer`, role: 'assistant' as const, text: exchange.answer.text, citations: exchange.answer.citations },
        ]) })
      })
      .catch(() => { /* 이력을 못 불러와도 새 질문은 할 수 있다 */ })
    return () => { ignore = true }
  }, [handoverId, repository])

  const send = useCallback(async (question: string) => {
    const value = question.trim()
    if (!value || pendingRef.current) return false
    pendingRef.current = true
    sequenceRef.current += 1
    const sequence = sequenceRef.current
    dispatch({ type: 'user', message: { id: `user-${sequence}`, role: 'user', text: value } })
    try {
      const answer = await repository.askQuestion(handoverId, value)
      dispatch({ type: 'answer', message: { id: `assistant-${sequence}`, role: 'assistant', text: answer.text, citations: answer.citations } })
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
