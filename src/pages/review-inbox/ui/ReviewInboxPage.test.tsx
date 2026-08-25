import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'

import { ReviewInboxPage } from './ReviewInboxPage'

describe('ReviewInboxPage', () => {
  it('shows three reviews and derives status filters', async () => {
    const user = userEvent.setup()
    render(<HandoverRepositoryProvider repository={new MockHandoverRepository()}><MemoryRouter><ReviewInboxPage /></MemoryRouter></HandoverRepositoryProvider>)
    expect(await screen.findAllByRole('article')).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: /승인 완료 1/ }))
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByText('월간 정산 업무 인수인계')).toBeInTheDocument()
  })
})
