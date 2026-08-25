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
    expect(screen.getByRole('heading', { name: '검토할 인수인계' })).toBeInTheDocument()
    expect(screen.getByText('제출된 문서를 확인하고 승인하거나 보완 의견을 남기세요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '홈으로' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'BATON 홈' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '승인 대기 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '보완 요청 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '승인 완료 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /승인 대기.*모아스토어 운영팀 업무 인수인계.*최서윤 → 정하늘.*운영팀.*업무 3개 · 첨부 3개.*오늘 14:30/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '승인 완료 1' }))
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByText('월간 정산 업무 인수인계')).toBeInTheDocument()
  })
})
