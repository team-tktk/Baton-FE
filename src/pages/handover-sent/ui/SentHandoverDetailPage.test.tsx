import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'
import { ToastProvider } from '@/shared/ui/toast'

import { SentHandoverDetailPage } from './SentHandoverDetailPage'

function renderDetail() {
  render(
    <HandoverRepositoryProvider repository={new MockHandoverRepository()}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/handovers/sent/handover-moastore-operations']}>
          <Routes>
            <Route path="/handovers/sent/:handoverId" element={<SentHandoverDetailPage />} />
            <Route path="/404" element={<p>없는 문서</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </HandoverRepositoryProvider>,
  )
}

describe('SentHandoverDetailPage', () => {
  it('shows the reviewer comments read-only, without the composer or review actions', async () => {
    renderDetail()

    // 책임자 코멘트는 전용 API로 채워져 그대로 보인다.
    expect(await screen.findByText(/가을 할인전 쿠폰 승인 순서가 명확해서/)).toBeInTheDocument()
    expect(screen.getByText('남겨진 검토 의견')).toBeInTheDocument()

    // 인계자 열람이므로 입력창·리뷰어 액션은 없어야 한다.
    expect(screen.queryByLabelText('검토 코멘트')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '코멘트 남기기' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '인수인계 승인' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '보완 요청' })).not.toBeInTheDocument()
  })
})
