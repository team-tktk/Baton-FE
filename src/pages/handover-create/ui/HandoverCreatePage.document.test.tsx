import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'
import { AuthProvider } from '@/features/auth'
import { CreateHandoverProvider } from '@/features/create-handover'
import { ToastProvider } from '@/shared/ui/toast'

import { HandoverCreatePage } from './HandoverCreatePage'

const ID = 'handover-moastore-operations'
const SIGNED_IN_USER = { id: 'u-1', email: 'seoyun@moastore.dev', name: '최서윤', team: '운영팀', position: '매니저', createdAt: '2026-08-01T00:00:00Z' }

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(SIGNED_IN_USER), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })))
})

afterEach(() => { vi.unstubAllGlobals() })

function renderFlow(repository: MockHandoverRepository) {
  const router = createMemoryRouter([
    { path: '/handovers/new/setup', element: <HandoverCreatePage step="setup" /> },
    { path: '/handovers/new/upload', element: <HandoverCreatePage step="upload" /> },
    { path: '/handovers/new/document', element: <HandoverCreatePage step="document" /> },
    { path: '/handovers/new/complete', element: <HandoverCreatePage step="complete" /> },
  ], { initialEntries: ['/handovers/new/setup'] })
  render(
    <HandoverRepositoryProvider repository={repository}>
      <AuthProvider>
        <CreateHandoverProvider>
          <ToastProvider><RouterProvider router={router} /></ToastProvider>
        </CreateHandoverProvider>
      </AuthProvider>
    </HandoverRepositoryProvider>,
  )
  return router
}

/** 기본 정보를 채워 초안을 만든 뒤 바로 초안 확인 단계로 간다. 첫 평가(75점)가 끝날 때까지 기다린다. */
async function reachDocument(user: UserEvent, router: ReturnType<typeof renderFlow>, options: { prepare?: () => Promise<void>; score?: string } = {}) {
  const recipients = within(screen.getByRole('region', { name: '업무를 받는 사람' }))
  await user.click(recipients.getByRole('combobox'))
  await user.click(await recipients.findByRole('option', { name: /정하늘/ }))
  await user.type(screen.getByRole('textbox', { name: '1번 업무' }), '프로모션 운영')
  await user.click(screen.getByRole('button', { name: /업무 자료 올리기/ }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/handovers/new/upload'))
  await options.prepare?.()
  await act(() => router.navigate('/handovers/new/document'))
  expect(await screen.findByText(options.score ?? '75')).toBeInTheDocument()
}

const keyIssue = (label: string) => within(screen.getByRole('region', { name: '중요 항목' })).getByRole('button', { name: new RegExp(label) })
const detail = (label: string) => within(screen.getByRole('article', { name: `${label} 자세히` }))

function editPurpose(text: string) {
  const purpose = screen.getByLabelText('업무 목적 편집')
  purpose.textContent = text
  fireEvent.blur(purpose)
}

describe('HandoverCreatePage document step readiness', () => {
  it('evaluates on arrival and saves edits with the base revision before evaluating again', async () => {
    const user = userEvent.setup()
    const repository = new MockHandoverRepository()
    const evaluate = vi.spyOn(repository, 'evaluateReadiness')
    const save = vi.spyOn(repository, 'saveDocument')
    const router = renderFlow(repository)
    await reachDocument(user, router)
    expect(evaluate).toHaveBeenCalledTimes(1)
    expect(save).not.toHaveBeenCalled()

    editPurpose('정하늘님이 프로모션 운영을 혼자 이어 갈 수 있게 합니다.')
    expect(await screen.findByText(/고친 내용은 아직 점검에 반영되지 않았어요/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '저장하고 다시 점검' }))
    await waitFor(() => expect(evaluate).toHaveBeenCalledTimes(2))
    expect(save).toHaveBeenCalledWith(ID, expect.objectContaining({ purpose: '정하늘님이 프로모션 운영을 혼자 이어 갈 수 있게 합니다.' }), 1)
    await waitFor(() => expect(screen.queryByText(/고친 내용은 아직/)).not.toBeInTheDocument())
    expect(screen.getByLabelText('업무 목적 편집')).toHaveTextContent('정하늘님이 프로모션 운영을 혼자 이어 갈 수 있게 합니다.')
  })

  it('keeps an edit made while the save is still in flight and saves only once', async () => {
    const user = userEvent.setup()
    const repository = new MockHandoverRepository()
    const original = repository.saveDocument.bind(repository)
    let release: () => void = () => {}
    const save = vi.spyOn(repository, 'saveDocument').mockImplementation(async (...args) => {
      await new Promise<void>((resolve) => { release = resolve })
      return original(...args)
    })
    const router = renderFlow(repository)
    await reachDocument(user, router)

    editPurpose('저장할 목적')
    await user.click(await screen.findByRole('button', { name: '저장하고 다시 점검' }))
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))

    const scope = screen.getByLabelText('담당 업무 편집')
    scope.textContent = '저장 중에 고친 범위'
    fireEvent.blur(scope)
    expect(screen.getByRole('button', { name: /제출하기/ })).toBeDisabled()
    await act(async () => { release() })

    await waitFor(() => expect(screen.getByText(/고친 내용은 아직 점검에 반영되지 않았어요/)).toBeInTheDocument())
    expect(save).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('업무 목적 편집')).toHaveTextContent('저장할 목적')
    expect(screen.getByLabelText('담당 업무 편집')).toHaveTextContent('저장 중에 고친 범위')
  })

  it('reloads the latest document instead of overwriting a change made elsewhere', async () => {
    const user = userEvent.setup()
    const repository = new MockHandoverRepository()
    const evaluate = vi.spyOn(repository, 'evaluateReadiness')
    const router = renderFlow(repository)
    await reachDocument(user, router)

    const { document } = await repository.getDocument(ID)
    await repository.saveDocument(ID, { ...document, purpose: '다른 창에서 바꾼 목적' })

    editPurpose('내가 고친 목적')
    await user.click(await screen.findByRole('button', { name: '저장하고 다시 점검' }))

    expect(await screen.findByText(/다른 곳에서 문서가 바뀌어 최신 문서를 다시 불러왔어요/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('업무 목적 편집')).toHaveTextContent('다른 창에서 바꾼 목적'))
    expect(evaluate).toHaveBeenCalledTimes(1)
  })

  it('moves to a flagged section and confirms before submitting a draft that is not ready', async () => {
    const user = userEvent.setup()
    const repository = new MockHandoverRepository()
    const submit = vi.spyOn(repository, 'submitHandover')
    const router = renderFlow(repository)
    await reachDocument(user, router)

    await user.click(within(screen.getByRole('region', { name: '중요 항목' })).getByRole('button', { name: /예외 대응/ }))
    await user.click(within(screen.getByRole('article', { name: '예외 대응 자세히' })).getByRole('button', { name: '문서에서 수정하기' }))
    expect(screen.getByLabelText('쿠폰 할인 승인 순서 내용 편집')).toHaveFocus()

    await user.click(screen.getByRole('button', { name: /제출하기/ }))
    const dialog = screen.getByRole('dialog', { name: '확인할 항목 3개가 남아 있어요' })
    expect(dialog).toHaveTextContent('아직 ‘보완 필요’ 상태예요')
    await user.click(within(dialog).getByRole('button', { name: '계속 보완하기' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(submit).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /제출하기/ }))
    await user.click(screen.getByRole('button', { name: '그래도 제출하기' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/handovers/new/complete'))
    expect(submit).toHaveBeenCalledWith(ID)
  })
})

describe('HandoverCreatePage document step AI fixes', () => {
  it('applies a proposed fix to the document and refreshes the checked items', async () => {
    const user = userEvent.setup()
    const repository = new MockHandoverRepository()
    const apply = vi.spyOn(repository, 'applyReadinessFix')
    const router = renderFlow(repository)
    await reachDocument(user, router)

    await user.click(keyIssue('예외 대응'))
    await user.click(detail('예외 대응').getByRole('button', { name: 'AI로 보완하기' }))
    const review = within(await screen.findByRole('region', { name: '보완 내용 확인' }))
    expect(review.getByText('2단계 / 2단계')).toBeInTheDocument()
    expect(review.getByRole('heading', { name: '문서에 추가할 내용을 확인해 주세요' })).toBeInTheDocument()
    expect(review.queryByText('선택됨')).not.toBeInTheDocument()
    const rules = window.document.getElementById('draft-section-rules-and-exceptions')!
    expect(rules).toHaveTextContent('예외 상황별 담당자와 처리 순서를 적어 주세요.')
    const proposedRemove = within(rules).getByRole('button', { name: /예외 상황별 담당자와 처리 순서를 적어 주세요.*제외/ })
    expect(proposedRemove.closest('li')).toHaveAttribute('data-ai-added', 'true')
    expect(within(rules).queryByRole('complementary', { name: 'AI가 추가할 내용' })).not.toBeInTheDocument()

    await user.click(proposedRemove)
    expect(rules).not.toHaveTextContent('예외 상황별 담당자와 처리 순서를 적어 주세요.')
    expect(review.getByRole('button', { name: '0개 적용하기' })).toBeDisabled()
    await user.click(review.getByRole('button', { name: '제외한 1개 다시 포함' }))
    expect(rules).toHaveTextContent('예외 상황별 담당자와 처리 순서를 적어 주세요.')

    await user.click(review.getByRole('button', { name: '1개 적용하기' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: '보완 내용 확인' })).not.toBeInTheDocument())
    expect(apply).toHaveBeenCalledWith(ID, 'fix-1', 1)
    expect(await screen.findByText('업무 기준과 예외에 반영했어요 · 확인할 항목 3개 → 2개')).toBeInTheDocument()
    expect(window.document.getElementById('draft-section-rules-and-exceptions')).toHaveAttribute('data-just-applied', 'true')
    expect(screen.getByLabelText('업무 기준 4 내용 편집')).toHaveTextContent('예외 상황별 담당자와 처리 순서를 적어 주세요.')
    expect(screen.getByText('83')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '중요 항목' })).queryByRole('button', { name: /예외 대응/ })).not.toBeInTheDocument()
  })

  it('fills an empty section from answers to follow-up questions', async () => {
    const user = userEvent.setup()
    const repository = new MockHandoverRepository()
    const router = renderFlow(repository)
    await reachDocument(user, router, {
      score: '50',
      prepare: async () => {
        const { document } = await repository.getDocument(ID)
        await repository.saveDocument(ID, { ...document, activeTasks: [] })
      },
    })

    const ongoing = window.document.getElementById('draft-section-ongoing-tasks')!
    expect(ongoing).toHaveTextContent('비어 있어요')
    await user.click(within(ongoing).getByRole('button', { name: 'AI로 채우기' }))
    const dialog = within(await screen.findByRole('dialog', { name: '진행 현황 보완' }))
    await user.type(await dialog.findByRole('textbox', { name: /진행 중인 업무에 들어갈 내용을 알려 주세요/ }), '법무 검토 회신을 기다린 뒤 공급사 코드를 등록합니다.')
    await user.click(dialog.getByRole('button', { name: /AI로 수정안 만들기/ }))
    const review = within(await screen.findByRole('region', { name: '보완 내용 확인' }))
    expect(window.document.getElementById('draft-section-ongoing-tasks')).toHaveTextContent('법무 검토 회신을 기다린 뒤 공급사 코드를 등록합니다.')

    await user.click(review.getByRole('button', { name: '1개 적용하기' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(window.document.getElementById('draft-section-ongoing-tasks')).toHaveTextContent('법무 검토 회신을 기다린 뒤 공급사 코드를 등록합니다.')
    expect(await screen.findByText('진행 중인 업무에 반영했어요 · 확인할 항목 5개 → 3개')).toBeInTheDocument()
  })

  it('does not start a fix while the evaluation is outdated and discards a cancelled one', async () => {
    const user = userEvent.setup()
    const repository = new MockHandoverRepository()
    const discard = vi.spyOn(repository, 'discardReadinessFix')
    const start = vi.spyOn(repository, 'startReadinessFix')
    const router = renderFlow(repository)
    await reachDocument(user, router)

    await user.click(keyIssue('실행 절차'))
    await user.click(detail('실행 절차').getByRole('button', { name: 'AI로 보완하기' }))
    const review = within(await screen.findByRole('region', { name: '보완 내용 확인' }))
    await user.click(review.getByRole('button', { name: '취소' }))
    await waitFor(() => expect(discard).toHaveBeenCalledWith(ID, 'fix-1'))

    editPurpose('새로 고친 목적')
    await user.click(keyIssue('실행 절차'))
    expect(await detail('실행 절차').findByRole('button', { name: 'AI로 보완하기' })).toBeDisabled()
    expect(detail('실행 절차').getByText(/저장하고 다시 점검한 뒤 보완할 수 있어요/)).toBeInTheDocument()
    expect(start).toHaveBeenCalledTimes(1)
  })

  it('refuses to apply over a document changed elsewhere and reloads it', async () => {
    const user = userEvent.setup()
    const repository = new MockHandoverRepository()
    const router = renderFlow(repository)
    await reachDocument(user, router)

    await user.click(keyIssue('실행 절차'))
    await user.click(detail('실행 절차').getByRole('button', { name: 'AI로 보완하기' }))
    const review = within(await screen.findByRole('region', { name: '보완 내용 확인' }))
    const { document } = await repository.getDocument(ID)
    await repository.saveDocument(ID, { ...document, purpose: '다른 창에서 바꾼 목적' })

    await user.click(review.getByRole('button', { name: /적용하기/ }))
    expect((await review.findAllByRole('alert'))[0]).toHaveTextContent('문서가 바뀌어 적용하지 않았어요')
    await waitFor(() => expect(screen.getByLabelText('업무 목적 편집')).toHaveTextContent('다른 창에서 바꾼 목적'))
    expect(review.getByRole('button', { name: /적용하기/ })).toBeDisabled()
  })
})
