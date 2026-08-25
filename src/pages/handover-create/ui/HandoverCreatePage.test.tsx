import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'
import { CreateHandoverProvider } from '@/features/create-handover'
import { ToastProvider } from '@/shared/ui/toast'

import { HandoverCreatePage } from './HandoverCreatePage'

function renderFlow(initialPath: string, repository = new MockHandoverRepository()) {
  const router = createMemoryRouter([
    { path: '/', element: <p>홈 화면</p> },
    { path: '/handovers/new/setup', element: <HandoverCreatePage step="setup" /> },
    { path: '/handovers/new/upload', element: <HandoverCreatePage step="upload" /> },
  ], { initialEntries: [initialPath] })
  render(
    <HandoverRepositoryProvider repository={repository}>
      <CreateHandoverProvider>
        <ToastProvider><RouterProvider router={router} /></ToastProvider>
      </CreateHandoverProvider>
    </HandoverRepositoryProvider>,
  )
  return router
}

describe('HandoverCreatePage setup and upload', () => {
  it('uses the six-step setup chrome and returns home', async () => {
    const user = userEvent.setup()
    const router = renderFlow('/handovers/new/setup')

    expect(screen.getByText('1 / 6')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'BATON 홈' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '홈으로' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('opens and filters the recipient popover while keeping all mock members', async () => {
    const user = userEvent.setup()
    renderFlow('/handovers/new/setup')

    expect(await screen.findByRole('button', { name: '정하늘 선택 해제' })).toBeInTheDocument()
    expect(screen.queryByRole('listbox', { name: '멤버 목록' })).not.toBeInTheDocument()

    const combobox = screen.getByRole('combobox', { name: '이름 또는 팀 검색' })
    expect(combobox).toHaveAttribute('aria-expanded', 'false')

    await user.click(combobox.parentElement!.parentElement!)
    expect(combobox).toHaveFocus()
    expect(await screen.findByRole('listbox', { name: '멤버 목록' })).toBeInTheDocument()
    expect(combobox).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('option')).toHaveLength(8)

    await user.type(combobox, '상품팀')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('option', { name: /김민준/ })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox', { name: '멤버 목록' })).not.toBeInTheDocument()
  })

  it('updates removable recipient chips from the member popover', async () => {
    const user = userEvent.setup()
    renderFlow('/handovers/new/setup')

    await user.click(await screen.findByRole('button', { name: '정하늘 선택 해제' }))
    expect(screen.getByText('0명 선택')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: '이름 또는 팀 검색' }))
    await user.click(screen.getByRole('option', { name: /김민준/ }))

    expect(screen.getByRole('button', { name: '김민준 선택 해제' })).toBeInTheDocument()
    expect(screen.getByText('1명 선택')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '이름 또는 팀 검색' })).toHaveValue('')

    await user.click(screen.getByRole('heading', { name: '넘길 업무' }))
    expect(screen.queryByRole('listbox', { name: '멤버 목록' })).not.toBeInTheDocument()
  })

  it('supports keyboard navigation and restores focus when the popup closes', async () => {
    const user = userEvent.setup()
    renderFlow('/handovers/new/setup')
    const combobox = screen.getByRole('combobox', { name: '이름 또는 팀 검색' })

    await user.click(combobox)
    await user.keyboard('{ArrowDown}')
    expect(combobox).toHaveAttribute('aria-activedescendant', expect.stringContaining('member-option-'))

    await user.keyboard('{Enter}')
    expect(screen.getByText('2명 선택')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox', { name: '멤버 목록' })).not.toBeInTheDocument()
    expect(combobox).toHaveFocus()
  })

  it('leaves the combobox without tabbing through listbox options', async () => {
    const user = userEvent.setup()
    renderFlow('/handovers/new/setup')
    const combobox = screen.getByRole('combobox', { name: '이름 또는 팀 검색' })

    await user.click(combobox)
    await user.tab()

    expect(screen.getByRole('textbox', { name: '1번 업무' })).toHaveFocus()
    expect(screen.queryByRole('listbox', { name: '멤버 목록' })).not.toBeInTheDocument()
  })

  it('loads setup members and starter attachments only once', async () => {
    const user = userEvent.setup()
    const repository = new MockHandoverRepository()
    const listMembers = vi.spyOn(repository, 'listMembers')
    const getHandover = vi.spyOn(repository, 'getHandover')

    const router = renderFlow('/handovers/new/setup', repository)

    expect(await screen.findByRole('button', { name: '정하늘 선택 해제' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '업무 자료 올리기' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/handovers/new/upload')
    })
    expect(await screen.findByText('가을_할인전_준비_메모.docx')).toBeInTheDocument()

    await waitFor(() => {
      expect(listMembers).toHaveBeenCalledTimes(1)
      expect(getHandover).toHaveBeenCalledTimes(1)
    })
  })

  it('creates a draft from selected recipients and work items', async () => {
    const user = userEvent.setup()
    const router = renderFlow('/handovers/new/setup')

    expect(await screen.findByRole('button', { name: '정하늘 선택 해제' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+ 업무 추가' }))
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
