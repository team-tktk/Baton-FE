import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'

import { SentHandoverPage } from './SentHandoverPage'

function renderPage() {
  render(
    <HandoverRepositoryProvider repository={new MockHandoverRepository()}>
      <MemoryRouter initialEntries={['/handovers/sent']}>
        <Routes>
          <Route path="/handovers/sent" element={<SentHandoverPage />} />
          <Route path="/handovers/sent/:handoverId" element={<p>인수인계 상세</p>} />
        </Routes>
      </MemoryRouter>
    </HandoverRepositoryProvider>,
  )
}

describe('SentHandoverPage', () => {
  it('lists the handovers the user created with their status and totals', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: '내가 만든 인수인계' })).toBeInTheDocument()
    // 카드는 불러온 목록만큼 그려야 한다(목업 3건).
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.getByRole('button', { name: /가을 정기 할인전 준비.*받는 사람 1명.*업무 3개 · 첨부 3개.*오늘 14:30/ })).toBeInTheDocument()
    expect(screen.getByText('9월 신규 캠페인 세팅')).toBeInTheDocument()
  })

  it('opens the read-only detail when a card is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /가을 정기 할인전 준비/ }))
    expect(screen.getByText('인수인계 상세')).toBeInTheDocument()
  })
})
