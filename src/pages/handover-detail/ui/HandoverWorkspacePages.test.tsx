import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'
import { AuthProvider } from '@/features/auth'
import { DEMO_ROLE_KEY, DEMO_SESSION_KEY } from '@/features/auth/model/demoAuth'
import { ToastProvider } from '@/shared/ui/toast'

import { HandoverChatPage } from './HandoverChatPage'
import { HandoverWorkspacePage } from './HandoverWorkspacePage'

function renderPage(element: React.ReactNode, path: string) {
  sessionStorage.setItem(DEMO_SESSION_KEY, 'active')
  sessionStorage.setItem(DEMO_ROLE_KEY, 'recipient')
  render(<AuthProvider><HandoverRepositoryProvider repository={new MockHandoverRepository()}><ToastProvider><MemoryRouter initialEntries={[path]}><Routes><Route path="/handovers/:handoverId/*" element={element} /><Route path="/" element={<p>홈 화면</p>} /></Routes></MemoryRouter></ToastProvider></HandoverRepositoryProvider></AuthProvider>)
}

describe('handover workspace pages', () => {
  beforeEach(() => { Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() }) })
  afterEach(() => { sessionStorage.clear() })

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

  it('returns home after the recipient confirms the handover', async () => {
    const user = userEvent.setup()
    renderPage(<HandoverWorkspacePage />, '/handovers/handover-moastore-operations')

    await user.click(await screen.findByRole('button', { name: /내용 확인 완료/ }))

    expect(screen.getByText('홈 화면')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('정하늘님이 인수인계 내용을 확인했어요')
    expect(sessionStorage.getItem(DEMO_ROLE_KEY)).toBe('recipient')
  })

  it('renders the dedicated chat route', async () => {
    renderPage(<HandoverChatPage />, '/handovers/handover-moastore-operations/chat')
    expect(await screen.findByText('인수인계 AI')).toBeInTheDocument()
  })
})
