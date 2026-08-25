import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'

import { HandoverChat } from './HandoverChat'

describe('HandoverChat', () => {
  beforeEach(() => { Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() }) })

  it('asks a suggestion, displays its source, and scrolls to the answer', async () => {
    const user = userEvent.setup()
    render(<HandoverRepositoryProvider repository={new MockHandoverRepository()}><HandoverChat handoverId="handover-moastore-operations" /></HandoverRepositoryProvider>)
    await user.click(screen.getByRole('button', { name: '배송이 늦어지면 누구에게 알려야 하나요?' }))
    expect(await screen.findByText(/오늘 오후 3시까지 물류팀 답변이 없으면/)).toBeInTheDocument()
    expect(screen.getByText('문제 상황 대응 방법 · 할 일 목록')).toBeInTheDocument()
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
  })
})
