import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'
import { CreateHandoverProvider } from '@/features/create-handover'
import { ToastProvider } from '@/shared/ui/toast'

import { HandoverCreatePage } from './HandoverCreatePage'

const RECIPIENTS = '업무를 받는 사람'
const REVIEWERS = '검토하는 사람'

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

const picker = (name: string) => within(screen.getByRole('region', { name }))

async function pickMember(user: UserEvent, pickerName: string, member: RegExp) {
  const scope = picker(pickerName)
  await user.click(scope.getByRole('combobox'))
  await user.click(await scope.findByRole('option', { name: member }))
}

describe('HandoverCreatePage setup and upload', () => {
  it('uses the five-step setup chrome and returns home', async () => {
    const user = userEvent.setup()
    const router = renderFlow('/handovers/new/setup')

    expect(screen.getByText('1 / 5')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'BATON 홈' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '홈으로' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('starts with nobody selected in either picker', async () => {
    renderFlow('/handovers/new/setup')

    await waitFor(() => expect(picker(RECIPIENTS).getByText('0명 선택')).toBeInTheDocument())
    expect(picker(REVIEWERS).getByText('0명 선택')).toBeInTheDocument()
  })

  it('opens and filters the recipient popover while keeping all mock members', async () => {
    const user = userEvent.setup()
    renderFlow('/handovers/new/setup')
    const scope = picker(RECIPIENTS)

    expect(scope.queryByRole('listbox')).not.toBeInTheDocument()
    const combobox = scope.getByRole('combobox', { name: `${RECIPIENTS} 검색` })
    expect(combobox).toHaveAttribute('aria-expanded', 'false')

    await user.click(combobox.parentElement!.parentElement!)
    expect(combobox).toHaveFocus()
    expect(await scope.findByRole('listbox', { name: `${RECIPIENTS} 목록` })).toBeInTheDocument()
    expect(combobox).toHaveAttribute('aria-expanded', 'true')
    await waitFor(() => expect(scope.getAllByRole('option')).toHaveLength(8))

    await user.type(combobox, '상품팀')
    expect(scope.getAllByRole('option')).toHaveLength(1)
    expect(scope.getByRole('option', { name: /김민준/ })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(scope.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('updates removable recipient chips from the member popover', async () => {
    const user = userEvent.setup()
    renderFlow('/handovers/new/setup')

    await pickMember(user, RECIPIENTS, /김민준/)

    const scope = picker(RECIPIENTS)
    expect(scope.getByRole('button', { name: '김민준 선택 해제' })).toBeInTheDocument()
    expect(scope.getByText('1명 선택')).toBeInTheDocument()
    expect(scope.getByRole('combobox')).toHaveValue('')

    await user.click(scope.getByRole('button', { name: '김민준 선택 해제' }))
    expect(scope.getByText('0명 선택')).toBeInTheDocument()
  })

  it('keeps the reviewer picker independent from the recipient picker', async () => {
    const user = userEvent.setup()
    renderFlow('/handovers/new/setup')

    await pickMember(user, RECIPIENTS, /정하늘/)
    await pickMember(user, REVIEWERS, /이도현/)

    expect(picker(RECIPIENTS).getByRole('button', { name: '정하늘 선택 해제' })).toBeInTheDocument()
    expect(picker(RECIPIENTS).getByText('1명 선택')).toBeInTheDocument()
    expect(picker(REVIEWERS).getByRole('button', { name: '이도현 선택 해제' })).toBeInTheDocument()
    expect(picker(REVIEWERS).getByText('1명 선택')).toBeInTheDocument()
  })

  it('supports keyboard navigation and restores focus when the popup closes', async () => {
    const user = userEvent.setup()
    renderFlow('/handovers/new/setup')
    const scope = picker(RECIPIENTS)
    const combobox = scope.getByRole('combobox')

    await user.click(combobox)
    await waitFor(() => expect(scope.getAllByRole('option').length).toBeGreaterThan(0))
    await user.keyboard('{ArrowDown}')
    expect(combobox).toHaveAttribute('aria-activedescendant', expect.stringContaining('member-option-'))

    await user.keyboard('{Enter}')
    expect(scope.getByText('1명 선택')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(scope.queryByRole('listbox')).not.toBeInTheDocument()
    expect(combobox).toHaveFocus()
  })

  it('leaves the combobox without tabbing through listbox options', async () => {
    const user = userEvent.setup()
    renderFlow('/handovers/new/setup')
    const combobox = picker(RECIPIENTS).getByRole('combobox')

    await user.click(combobox)
    await user.tab()

    expect(picker(REVIEWERS).getByRole('combobox')).toHaveFocus()
    expect(picker(RECIPIENTS).queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('loads members once and reads the draft files on the upload step', async () => {
    const user = userEvent.setup()
    const repository = new MockHandoverRepository()
    const listMembers = vi.spyOn(repository, 'listMembers')
    const listFiles = vi.spyOn(repository, 'listFiles')

    const router = renderFlow('/handovers/new/setup', repository)

    await pickMember(user, RECIPIENTS, /정하늘/)
    expect(listFiles).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '업무 자료 올리기' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/handovers/new/upload')
    })
    expect(await screen.findByText('가을_할인전_준비_메모.docx')).toBeInTheDocument()
    expect(screen.getAllByText('업로드 완료')).toHaveLength(3)

    await waitFor(() => expect(listMembers).toHaveBeenCalledTimes(1))
    expect(listFiles).toHaveBeenCalledWith('handover-moastore-operations')
  })

  it('uploads a selected file and removes it through the repository', async () => {
    const user = userEvent.setup()
    const repository = new MockHandoverRepository()
    const uploadFile = vi.spyOn(repository, 'uploadFile')
    const deleteFile = vi.spyOn(repository, 'deleteFile')
    renderFlow('/handovers/new/setup', repository)

    await pickMember(user, RECIPIENTS, /정하늘/)
    await user.click(screen.getByRole('button', { name: '업무 자료 올리기' }))
    expect(await screen.findByText('가을_할인전_준비_메모.docx')).toBeInTheDocument()

    const file = new File(['mock'], '신규_운영_메모.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByTestId('handover-file-input'), file)

    expect(await screen.findByText('신규_운영_메모.pdf')).toBeInTheDocument()
    expect(uploadFile).toHaveBeenCalledWith('handover-moastore-operations', file)

    await user.click(screen.getByRole('button', { name: '신규_운영_메모.pdf 삭제' }))
    await waitFor(() => expect(screen.queryByText('신규_운영_메모.pdf')).not.toBeInTheDocument())
    expect(deleteFile).toHaveBeenCalled()
  })

  it('rejects an unsupported file without calling the repository', async () => {
    const user = userEvent.setup()
    const repository = new MockHandoverRepository()
    const uploadFile = vi.spyOn(repository, 'uploadFile')
    renderFlow('/handovers/new/setup', repository)

    await pickMember(user, RECIPIENTS, /정하늘/)
    await user.click(screen.getByRole('button', { name: '업무 자료 올리기' }))
    expect(await screen.findByText('가을_할인전_준비_메모.docx')).toBeInTheDocument()

    fireEvent.change(screen.getByTestId('handover-file-input'), {
      target: { files: [new File(['x'], '메모.txt', { type: 'text/plain' })] },
    })

    expect(await screen.findByRole('status')).toHaveTextContent('PDF, DOCX, XLSX, PPTX 파일만 추가할 수 있어요')
    expect(uploadFile).not.toHaveBeenCalled()
  })

  it('creates a draft from the selected recipient, reviewer and work items', async () => {
    const user = userEvent.setup()
    const repository = new MockHandoverRepository()
    const createDraft = vi.spyOn(repository, 'createDraft')
    const router = renderFlow('/handovers/new/setup', repository)

    await pickMember(user, RECIPIENTS, /정하늘/)
    await pickMember(user, REVIEWERS, /이도현/)
    await user.click(screen.getByRole('button', { name: '+ 업무 추가' }))
    await user.type(screen.getAllByPlaceholderText('업무를 입력하세요').at(-1)!, '신규 파트너 안내')
    await user.click(screen.getByRole('button', { name: '업무 자료 올리기' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/handovers/new/upload'))
    expect(createDraft).toHaveBeenCalledWith({
      recipientIds: ['user-jung-haneul'],
      reviewerIds: ['user-lee-dohyeon'],
      workItems: ['프로모션 운영', '주문 현황 관리', '배송업체 협업', '신규 파트너 안내'],
    })
    expect(await screen.findByText('가을_할인전_준비_메모.docx')).toBeInTheDocument()
  })

  it('asks for a recipient before creating a draft', async () => {
    const user = userEvent.setup()
    const router = renderFlow('/handovers/new/setup')

    await user.click(screen.getByRole('button', { name: '업무 자료 올리기' }))

    expect(await screen.findByRole('status')).toHaveTextContent('받는 사람과 업무를 한 개 이상 입력해 주세요')
    expect(router.state.location.pathname).toBe('/handovers/new/setup')
  })

  it('redirects a direct upload visit without a draft', async () => {
    const router = renderFlow('/handovers/new/upload')

    await waitFor(() => expect(router.state.location.pathname).toBe('/handovers/new/setup'))
    expect(screen.getByRole('status')).toHaveTextContent('먼저 누구에게 어떤 업무를 넘길지 알려주세요')
  })
})
