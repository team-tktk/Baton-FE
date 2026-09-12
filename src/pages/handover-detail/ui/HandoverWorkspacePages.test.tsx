import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
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

  it('shows the read-only document and downloads the attachment when clicked', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

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
    await waitFor(() => expect(click).toHaveBeenCalled())
    expect(createObjectURL).toHaveBeenCalled()
    click.mockRestore()
  })

  it('folds and reopens the handover AI panel beside the document', async () => {
    const user = userEvent.setup()
    renderPage(<HandoverWorkspacePage />, '/handovers/handover-moastore-operations')

    // 문서 옆에 열린 채로 시작한다. 모달이 아니라 보조 영역이다.
    expect(await screen.findByRole('heading', { name: '문서에 대해 물어보세요' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'AI에게 질문' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'AI 질문 패널 접기' }))

    // 접으면 접근성 트리에서 빠지고, 다시 여는 버튼으로 포커스가 옮겨간다.
    expect(screen.queryByRole('heading', { name: '문서에 대해 물어보세요' })).not.toBeInTheDocument()
    const trigger = screen.getByRole('button', { name: 'AI에게 질문' })
    expect(trigger).toHaveFocus()

    await user.click(trigger)

    expect(screen.getByRole('heading', { name: '문서에 대해 물어보세요' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'AI에게 질문' })).not.toBeInTheDocument()
  })

  it('renders the dedicated chat route', async () => {
    renderPage(<HandoverChatPage />, '/handovers/handover-moastore-operations/chat')
    expect(await screen.findByText('인수인계 AI')).toBeInTheDocument()
  })
})
