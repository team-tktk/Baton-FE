import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { HandoverAnswer, HandoverChatExchange, HandoverRepository } from '@/entities/handover'
import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'

import { AI_RESPONSE_DELAY_MS, useHandoverChat } from './useHandoverChat'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe('useHandoverChat', () => {
  afterEach(() => { vi.useRealTimers() })

  it('keeps user order, blocks duplicate sends, and appends sourced answers', async () => {
    vi.useFakeTimers()
    const answer = deferred<HandoverAnswer>()
    const repository = new MockHandoverRepository()
    repository.askQuestion = vi.fn().mockReturnValue(answer.promise)
    const wrapper = ({ children }: React.PropsWithChildren) => <HandoverRepositoryProvider repository={repository as HandoverRepository}>{children}</HandoverRepositoryProvider>
    const { result } = renderHook(() => useHandoverChat('handover-moastore-operations'), { wrapper })

    expect(result.current.messages[0]?.text).toContain('궁금한 내용을 물어보세요')
    let first!: Promise<boolean>
    await act(async () => { first = result.current.send('배송이 늦으면 어떻게 해요?') })
    expect(result.current.messages.at(-1)).toMatchObject({ role: 'user', text: '배송이 늦으면 어떻게 해요?' })
    expect(result.current.status).toBe('sending')
    await act(async () => { expect(await result.current.send('중복 질문')).toBe(false) })
    expect(repository.askQuestion).toHaveBeenCalledTimes(1)

    answer.resolve({ text: '물류팀에 먼저 알려주세요.', grounded: true, citations: [{ sourceId: 'source-1', title: '문제 상황 대응 방법', locator: '할 일 목록' }] })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AI_RESPONSE_DELAY_MS - 1)
    })
    expect(result.current.status).toBe('sending')
    expect(result.current.messages.at(-1)).toMatchObject({ role: 'user' })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
      await first
    })
    expect(result.current.messages.at(-1)).toMatchObject({
      role: 'assistant',
      citations: [{ title: '문제 상황 대응 방법', locator: '할 일 목록' }],
    })
    expect(result.current.status).toBe('idle')
  })

  it('rejects blank questions without calling the repository', async () => {
    const repository = new MockHandoverRepository()
    const askQuestion = vi.spyOn(repository, 'askQuestion')
    const wrapper = ({ children }: React.PropsWithChildren) => <HandoverRepositoryProvider repository={repository}>{children}</HandoverRepositoryProvider>
    const { result } = renderHook(() => useHandoverChat('handover-moastore-operations'), { wrapper })
    await act(async () => { expect(await result.current.send('   ')).toBe(false) })
    expect(askQuestion).not.toHaveBeenCalled()
  })

  it('keeps a question sent before the history arrives', async () => {
    const history = deferred<HandoverChatExchange[]>()
    const answer = deferred<HandoverAnswer>()
    const repository = new MockHandoverRepository()
    vi.spyOn(repository, 'listChatMessages').mockReturnValue(history.promise)
    vi.spyOn(repository, 'askQuestion').mockReturnValue(answer.promise)
    const wrapper = ({ children }: React.PropsWithChildren) => <HandoverRepositoryProvider repository={repository as HandoverRepository}>{children}</HandoverRepositoryProvider>
    const { result } = renderHook(() => useHandoverChat('handover-moastore-operations'), { wrapper })

    await act(async () => { void result.current.send('배송이 늦으면요?') })
    expect(result.current.status).toBe('sending')

    await act(async () => {
      history.resolve([{ id: 'past', question: '지난 질문', answer: { text: '지난 답변', grounded: true, citations: [] } }])
      await history.promise
    })

    // 이력은 인사말 뒤에, 방금 보낸 질문은 맨 끝에 남아야 한다.
    expect(result.current.messages.map((message) => message.text)).toEqual([
      result.current.messages[0].text,
      '지난 질문',
      '지난 답변',
      '배송이 늦으면요?',
    ])
    expect(result.current.status).toBe('sending')
  })
})
