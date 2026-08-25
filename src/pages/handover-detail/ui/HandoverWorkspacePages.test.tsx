import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'
import { ToastProvider } from '@/shared/ui/toast'

import { HandoverChatPage } from './HandoverChatPage'
import { HandoverWorkspacePage } from './HandoverWorkspacePage'

function renderPage(element: React.ReactNode, path: string) {
  render(<HandoverRepositoryProvider repository={new MockHandoverRepository()}><ToastProvider><MemoryRouter initialEntries={[path]}><Routes><Route path="/handovers/:handoverId/*" element={element} /></Routes></MemoryRouter></ToastProvider></HandoverRepositoryProvider>)
}

describe('handover workspace pages', () => {
  beforeEach(() => { Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() }) })

  it('shows the read-only document and explains that downloads are not ready', async () => {
    const user = userEvent.setup()
    renderPage(<HandoverWorkspacePage />, '/handovers/handover-moastore-operations')
    expect(await screen.findByRole('heading', { name: '업무 인수인계' })).toBeInTheDocument()
    expect(screen.getByText('최서윤님에게 받은 인수인계')).toBeInTheDocument()
    expect(screen.getByText('운영팀 · 오늘 14:30 전달')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '먼저 이어서 할 일' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '업무 기준과 예외' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '주요 관계자' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '첨부 문서' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: /가을_할인전_준비_메모.docx/ })[0]!)
    expect(screen.getByRole('status')).toHaveTextContent('파일 다운로드는 아직 준비 중이에요')
  })

  it('opens the handover AI in a dismissible side panel', async () => {
    const user = userEvent.setup()
    renderPage(<HandoverWorkspacePage />, '/handovers/handover-moastore-operations')

    expect(await screen.findByRole('button', { name: /AI에게 질문/ })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: '문서에 대해 물어보세요' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /AI에게 질문/ }))

    expect(screen.getByRole('dialog', { name: '문서에 대해 물어보세요' })).toBeInTheDocument()
    expect(screen.getByText('인수인계서와 첨부 문서 3개를 함께 찾아봐요.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'AI 질문 패널 닫기' }))
    expect(screen.queryByRole('dialog', { name: '문서에 대해 물어보세요' })).not.toBeInTheDocument()
  })

  it('renders the dedicated chat route', async () => {
    renderPage(<HandoverChatPage />, '/handovers/handover-moastore-operations/chat')
    expect(await screen.findByText('인수인계 AI')).toBeInTheDocument()
  })
})
