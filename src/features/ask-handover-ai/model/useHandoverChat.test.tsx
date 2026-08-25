import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { HandoverRepository } from '@/entities/handover'
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
    const answer = deferred<{ text: string; source: string | null }>()
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

    answer.resolve({ text: '물류팀에 먼저 알려주세요.', source: '문제 상황 대응 방법' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AI_RESPONSE_DELAY_MS - 1)
    })
    expect(result.current.status).toBe('sending')
    expect(result.current.messages.at(-1)).toMatchObject({ role: 'user' })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
      await first
    })
    expect(result.current.messages.at(-1)).toMatchObject({ role: 'assistant', source: '문제 상황 대응 방법' })
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
})
