import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/shared/ui/toast'
import { DemoPage } from './DemoPage'

afterEach(() => vi.unstubAllGlobals())

it('writes, submits, answers and approves the same document without network calls', async () => {
  Element.prototype.scrollIntoView = vi.fn()
  const network = vi.fn(() => { throw new Error('Demo must not call the backend') })
  vi.stubGlobal('fetch', network)
  const user = userEvent.setup()
  const router = createMemoryRouter([{ path: '/demo/*', element: <DemoPage /> }], { initialEntries: ['/demo'] })
  render(<ToastProvider><RouterProvider router={router} /></ToastProvider>)
  const dismiss = async () => user.click(await screen.findByRole('button', { name: '직접 해보기' }))
  await dismiss()
  await user.click(screen.getByRole('button', { name: /업무 자료 올리기/ }))
  await dismiss()
  await user.click(screen.getByRole('button', { name: /준비된 샘플 파일 3개 추가/ }))
  expect(await screen.findByText('가을_할인전_준비_메모.txt')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '민감정보 확인하기' }))
  await dismiss()
  await user.click(await screen.findByRole('button', { name: 'AI 분석 시작' }))
  await waitFor(() => expect(screen.getByRole('button', { name: '직접 해보기' })).toBeInTheDocument(), { timeout: 8000 })
  await dismiss()
  // 질문 수가 바뀌어도 마지막 문항까지 실제 화면 상태를 따라간다.
  for (let guard = 0; guard < 10; guard++) {
    await user.click((await screen.findAllByRole('radio'))[0])
    const finish = screen.queryByRole('button', { name: /답변 반영하고 초안 보기/ })
    if (finish) {
      await user.click(finish)
      break
    }
    const currentQuestion = screen.getByRole('heading', { level: 2 }).textContent
    await user.click(screen.getByRole('button', { name: /다음 질문/ }))
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).not.toHaveTextContent(currentQuestion ?? ''))
  }
  await dismiss()
  await user.click(await screen.findByRole('button', { name: '제출하기' }))
  const submitAnyway = screen.queryByRole('button', { name: '그래도 제출하기' })
  if (submitAnyway) await user.click(submitAnyway)
  await dismiss()
  await user.click(screen.getByRole('button', { name: '② 받은 인수인계 · 질문' }))
  await dismiss()
  await user.click(await screen.findByRole('button', { name: /최서윤님에게 받은 인수인계/ }))
  await dismiss()
  await user.click(await screen.findByRole('button', { name: '첫날 가장 먼저 할 일은?' }))
  await waitFor(() => expect(screen.getByRole('button', { name: '③ 팀장 승인' })).toBeEnabled())
  await user.click(screen.getByRole('button', { name: '③ 팀장 승인' }))
  await dismiss()
  await user.click(within(await screen.findByRole('region', { name: '검토할 인수인계 목록' })).getByRole('button'))
  await dismiss()
  const approve = await screen.findByRole('button', { name: '인수인계 승인' })
  expect(approve).toBeDisabled()
  for (const checkbox of screen.getAllByRole('checkbox')) await user.click(checkbox)
  await waitFor(() => expect(approve).toBeEnabled())
  await user.click(approve)
  expect(await screen.findByText('작성부터 질문, 팀장 승인까지 모두 완료했어요!')).toBeInTheDocument()
  expect(network).not.toHaveBeenCalled()
}, 20000)
