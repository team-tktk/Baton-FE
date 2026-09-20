import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getReceivedHandovers } from '@/test/handoverFactory'

import { HandoverInbox } from './HandoverInbox'

describe('HandoverInbox', () => {
  it('does not render an empty list container when there are no handovers', () => {
    render(<MemoryRouter><HandoverInbox handovers={[]} onOpen={vi.fn()} /></MemoryRouter>)

    expect(screen.getByText('해당 상태의 인수인계가 없어요')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '받은 인수인계 목록' })).not.toBeInTheDocument()
  })

  it('shows all fixture rows and filters them through the status query', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><HandoverInbox handovers={await getReceivedHandovers()} onOpen={vi.fn()} /></MemoryRouter>)

    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.getByRole('button', { name: '전체 3' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('최서윤님에게 받은 인수인계')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '완료 1' }))
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByText('운영지원팀 · 월간 정산 · 세금계산서 · 비용 보고')).toBeInTheDocument()
  })
})
