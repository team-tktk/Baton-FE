import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'

import { HandoverChat } from './HandoverChat'

describe('HandoverChat', () => {
  beforeEach(() => { Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() }) })

  it('asks a served suggestion, displays its source, and scrolls to the answer', async () => {
    const user = userEvent.setup()
    const repository = new MockHandoverRepository()
    vi.spyOn(repository, 'listSuggestedQuestions').mockResolvedValue(['배송이 늦어지면 누구에게 알려야 하나요?'])
    render(<HandoverRepositoryProvider repository={repository}><HandoverChat handoverId="handover-moastore-operations" /></HandoverRepositoryProvider>)

    // 추천 질문은 서버에서 온다. 도착할 때까지 기다린다.
    await user.click(await screen.findByRole('button', { name: '배송이 늦어지면 누구에게 알려야 하나요?' }))
    expect(await screen.findByText(/오늘 오후 3시까지 물류팀 답변이 없으면/)).toBeInTheDocument()
    expect(screen.getByText('문제 상황 대응 방법 · 할 일 목록')).toBeInTheDocument()
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('falls back to generic suggestions when the server has none', async () => {
    const repository = new MockHandoverRepository()
    vi.spyOn(repository, 'listSuggestedQuestions').mockResolvedValue([])
    render(<HandoverRepositoryProvider repository={repository}><HandoverChat handoverId="handover-moastore-operations" /></HandoverRepositoryProvider>)

    // 특정 인수인계 내용에 기대지 않는 문구여야 한다.
    expect(await screen.findByRole('button', { name: '첫날 가장 먼저 할 일은?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '막히면 누구에게 물어보면 되나요?' })).toBeInTheDocument()
  })
})
