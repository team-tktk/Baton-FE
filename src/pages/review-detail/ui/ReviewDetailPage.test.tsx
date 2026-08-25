import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'
import { ToastProvider } from '@/shared/ui/toast'

import { ReviewDetailPage } from './ReviewDetailPage'

describe('ReviewDetailPage', () => {
  it('renders comments as text and approves through the repository', async () => {
    const user = userEvent.setup()
    const repository = new MockHandoverRepository()
    render(<HandoverRepositoryProvider repository={repository}><ToastProvider><MemoryRouter initialEntries={['/reviews/handover-moastore-operations']}><Routes><Route path="/reviews/:handoverId" element={<ReviewDetailPage />} /></Routes></MemoryRouter></ToastProvider></HandoverRepositoryProvider>)

    expect(await screen.findByText('모아스토어 운영팀 업무 인수인계')).toBeInTheDocument()
    expect(screen.getByText('최서윤 → 정하늘 · 오늘 14:30 제출')).toBeInTheDocument()
    expect(screen.getByText('승인 대기')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'BATON 홈' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '먼저 이어서 할 일' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '업무 기준과 예외' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '첨부 문서' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '문서를 확인해 주세요' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '담당 업무와 다음 할 일이 명확해요' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: '판단 기준과 예외 상황이 포함됐어요' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: '필요한 첨부 자료와 권한이 준비됐어요' })).not.toBeChecked()

    await user.type(await screen.findByLabelText('검토 코멘트'), '<script>alert(1)</script>')
    await user.click(screen.getByRole('button', { name: '코멘트 남기기' }))
    expect(await screen.findByText('<script>alert(1)</script>')).toBeInTheDocument()
    expect(document.querySelector('script')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '인수인계 승인' }))
    expect(await screen.findByRole('status')).toHaveTextContent('인수인계를 승인했어요')
    expect(screen.getByRole('button', { name: '승인 완료' })).toBeInTheDocument()
    expect((await repository.getHandover('handover-moastore-operations')).status).toBe('approved')
  })
})
