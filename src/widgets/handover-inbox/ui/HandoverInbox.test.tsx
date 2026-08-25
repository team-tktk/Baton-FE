import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getReceivedHandovers } from '@/test/handoverFactory'

import { HandoverInbox } from './HandoverInbox'

describe('HandoverInbox', () => {
  it('shows all fixture rows and filters them through the status query', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><HandoverInbox handovers={await getReceivedHandovers()} onOpen={vi.fn()} /></MemoryRouter>)

    expect(screen.getAllByRole('article')).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: /확인 완료/ }))
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByText('월간 정산 · 세금계산서 · 비용 보고')).toBeInTheDocument()
  })
})
