import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'
import { CreateHandoverProvider } from '@/features/create-handover'
import { ToastProvider } from '@/shared/ui/toast'

import { HandoverCreatePage } from './HandoverCreatePage'

function renderFlow(initialPath: string) {
  const router = createMemoryRouter([
    { path: '/handovers/new/setup', element: <HandoverCreatePage step="setup" /> },
    { path: '/handovers/new/upload', element: <HandoverCreatePage step="upload" /> },
  ], { initialEntries: [initialPath] })
  render(
    <HandoverRepositoryProvider repository={new MockHandoverRepository()}>
      <CreateHandoverProvider>
        <ToastProvider><RouterProvider router={router} /></ToastProvider>
      </CreateHandoverProvider>
    </HandoverRepositoryProvider>,
  )
  return router
}

describe('HandoverCreatePage setup and upload', () => {
  it('creates a draft from selected recipients and work items', async () => {
    const user = userEvent.setup()
    const router = renderFlow('/handovers/new/setup')

    expect(await screen.findByRole('button', { name: /정하늘/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: '업무 추가' }))
    await user.type(screen.getAllByPlaceholderText('업무를 입력하세요').at(-1)!, '신규 파트너 안내')
    await user.click(screen.getByRole('button', { name: '업무 자료 올리기' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/handovers/new/upload'))
    expect(await screen.findByText('가을_할인전_준비_메모.docx')).toBeInTheDocument()
  })

  it('redirects a direct upload visit without a draft', async () => {
    const router = renderFlow('/handovers/new/upload')

    await waitFor(() => expect(router.state.location.pathname).toBe('/handovers/new/setup'))
    expect(screen.getByRole('status')).toHaveTextContent('먼저 누구에게 어떤 업무를 넘길지 알려주세요')
  })
})
