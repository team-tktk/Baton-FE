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

  it('drops the previous handover conversation when the id changes', async () => {
    const repository = new MockHandoverRepository()
    // 첫 렌더가 A, key가 바뀐 뒤 렌더가 B를 불러온다.
    vi.spyOn(repository, 'listSuggestedQuestions')
      .mockResolvedValueOnce(['A 인수인계 질문'])
      .mockResolvedValueOnce(['B 인수인계 질문'])
    vi.spyOn(repository, 'listChatMessages')
      .mockResolvedValueOnce([{ id: 'a-1', question: 'A 지난 질문', answer: { text: 'A 지난 답변', grounded: true, citations: [] } }])
      .mockResolvedValueOnce([])

    const view = render(
      <HandoverRepositoryProvider repository={repository}>
        <HandoverChat key="handover-a" handoverId="handover-a" />
      </HandoverRepositoryProvider>,
    )
    expect(await screen.findByText('A 지난 질문')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'A 인수인계 질문' })).toBeInTheDocument()

    // key가 바뀌면 이전 인수인계의 대화와 추천 질문이 남으면 안 된다.
    view.rerender(
      <HandoverRepositoryProvider repository={repository}>
        <HandoverChat key="handover-b" handoverId="handover-b" />
      </HandoverRepositoryProvider>,
    )

    expect(await screen.findByRole('button', { name: 'B 인수인계 질문' })).toBeInTheDocument()
    expect(screen.queryByText('A 지난 질문')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'A 인수인계 질문' })).not.toBeInTheDocument()
  })
})
