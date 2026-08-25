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

  it('shows the read-only document and explains fixture attachment downloads', async () => {
    const user = userEvent.setup()
    renderPage(<HandoverWorkspacePage />, '/handovers/handover-moastore-operations')
    expect(await screen.findByRole('heading', { name: '업무 인수인계' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: /가을_할인전_준비_메모.docx/ })[0]!)
    expect(screen.getByRole('status')).toHaveTextContent('목업 파일이라 실제 다운로드는 제공하지 않아요')
  })

  it('renders the dedicated chat route', async () => {
    renderPage(<HandoverChatPage />, '/handovers/handover-moastore-operations/chat')
    expect(await screen.findByText('인수인계 AI')).toBeInTheDocument()
  })
})
