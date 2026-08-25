import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'

import { ReviewInboxPage } from './ReviewInboxPage'

describe('ReviewInboxPage', () => {
  it('opens on the pending tab and counts each status from the loaded data', async () => {
    const user = userEvent.setup()
    render(<HandoverRepositoryProvider repository={new MockHandoverRepository()}><MemoryRouter><ReviewInboxPage /></MemoryRouter></HandoverRepositoryProvider>)
    // 전체 탭이 없으므로 승인 대기로 시작하고, 보이는 목록도 승인 대기만이어야 한다.
    expect(await screen.findAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('button', { name: '승인 대기 1' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: '검토할 인수인계' })).toBeInTheDocument()
    expect(screen.getByText('제출된 문서를 확인하고 승인하거나 보완 의견을 남기세요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '홈으로' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'BATON 홈' })).not.toBeInTheDocument()
    // 숫자는 하드코딩이 아니라 불러온 목록에서 세야 한다.
    expect(screen.getByRole('button', { name: '승인 대기 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '보완 요청 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '승인 완료 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /승인 대기.*모아스토어 운영팀 업무 인수인계.*최서윤 → 정하늘.*운영팀.*업무 3개 · 첨부 3개.*오늘 14:30/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '승인 완료 1' }))
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByText('월간 정산 업무 인수인계')).toBeInTheDocument()
  })
})
