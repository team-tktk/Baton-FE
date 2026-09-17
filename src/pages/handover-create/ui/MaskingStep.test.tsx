import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { HandoverAttachment, MaskingCandidate, MaskingReview } from '@/entities/handover'
import { HandoverRepositoryProvider, MockHandoverRepository, summarizeMasking } from '@/entities/handover'
import { ApiError } from '@/shared/api'

import { MaskingStep } from './MaskingStep'

const HANDOVER_ID = 'handover-moastore-operations'
const TEXT = '담당자 이메일: min@example.com\n지급 계좌: 110-123-456789'
const EMAIL = 'min@example.com'
const ACCOUNT = '110-123-456789'

const file = (status: HandoverAttachment['status']): HandoverAttachment => ({ id: 'file-1', name: '업무협약서.docx', mimeType: 'application/msword', size: 100, status })

function makeReview(pending: boolean): MaskingReview {
  const candidates: MaskingCandidate[] = [
    { id: 'c-email', type: 'EMAIL', typeLabel: '이메일', origin: 'detected', start: TEXT.indexOf(EMAIL), end: TEXT.indexOf(EMAIL) + EMAIL.length, confidence: 98, applied: true, needsReview: false, pendingReview: false, preview: 'min***@example.com' },
    { id: 'c-account', type: 'ACCOUNT', typeLabel: '계좌번호', origin: 'detected', start: TEXT.indexOf(ACCOUNT), end: TEXT.indexOf(ACCOUNT) + ACCOUNT.length, confidence: 78, applied: !pending, needsReview: true, pendingReview: pending, preview: '110-***-***789' },
  ]
  return { fileId: 'file-1', fileName: '업무협약서.docx', status: 'review', confirmed: false, text: TEXT, summary: summarizeMasking(candidates), candidates }
}

function setup({ attachments = [file('review')], review = makeReview(true) }: { attachments?: HandoverAttachment[]; review?: MaskingReview } = {}) {
  const repository = new MockHandoverRepository()
  repository.maskingReviews.set('file-1', review)
  const onProceed = vi.fn()
  const onFeedback = vi.fn()

  function Harness() {
    const [files, setFiles] = useState(attachments)
    return <MaskingStep attachments={files} handoverId={HANDOVER_ID} onAttachmentsChange={setFiles} onBack={vi.fn()} onFeedback={onFeedback} onProceed={onProceed} />
  }

  render(<HandoverRepositoryProvider repository={repository}><Harness /></HandoverRepositoryProvider>)
  return { onFeedback, onProceed, repository, user: userEvent.setup() }
}

const confirmButton = () => screen.getByRole('button', { name: '확정하고 AI 분석 시작' })
const accountCheckbox = () => screen.getByRole('checkbox', { name: '계좌번호 110-***-***789 가리기' })

describe('MaskingStep', () => {
  it('holds the confirmation until every item that needs review is checked', async () => {
    const { repository, user } = setup()
    const decide = vi.spyOn(repository, 'decideMaskingCandidate')

    expect(await screen.findByRole('heading', { name: '민감정보를 확인해 주세요' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '업무협약서.docx 추출 텍스트' })).toHaveTextContent('min***@example.com')
    expect(screen.getByText('확인이 필요한 항목 1개를 먼저 확인해 주세요')).toBeInTheDocument()
    expect(confirmButton()).toBeDisabled()

    await user.click(accountCheckbox())

    expect(decide).toHaveBeenCalledWith(HANDOVER_ID, 'file-1', 'c-account', true)
    expect(accountCheckbox()).toBeChecked()
    await waitFor(() => expect(confirmButton()).toBeEnabled())
  })

  it('rolls the checkbox back and shows the server reason when saving fails', async () => {
    const { onFeedback, repository, user } = setup()
    vi.spyOn(repository, 'decideMaskingCandidate').mockRejectedValue(new ApiError('검수 대기 상태가 아닙니다', { code: 'http', status: 409 }))

    await user.click(await screen.findByRole('checkbox', { name: '계좌번호 110-***-***789 가리기' }))

    await waitFor(() => expect(onFeedback).toHaveBeenCalledWith('검수 대기 상태가 아닙니다'))
    expect(accountCheckbox()).not.toBeChecked()
    expect(confirmButton()).toBeDisabled()
  })

  it('links a highlight in the text to the list item', async () => {
    const { user } = setup()
    const mark = await screen.findByRole('button', { name: /^이메일 min\*\*\*@example\.com/ })

    await user.click(mark)

    expect(mark).toHaveAttribute('aria-pressed', 'true')
  })

  it('asks once more, confirms every file and moves on after indexing', async () => {
    const { onProceed, repository, user } = setup({ review: makeReview(false) })
    const confirmMasking = vi.spyOn(repository, 'confirmMasking')
    vi.spyOn(repository, 'listFiles').mockResolvedValue([file('ready')])

    await waitFor(() => expect(confirmButton()).toBeEnabled())
    await user.click(confirmButton())

    const dialog = screen.getByRole('dialog', { name: '민감정보 검수를 확정할까요?' })
    expect(dialog).toHaveTextContent('파일 1개, 가려질 항목 2개')
    expect(dialog).toHaveTextContent('되돌릴 수 없어요')
    expect(confirmMasking).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '확정하고 분석 시작' }))

    await waitFor(() => expect(onProceed).toHaveBeenCalledTimes(1))
    expect(confirmMasking).toHaveBeenCalledWith(HANDOVER_ID, 'file-1')
  })

  it('shows the remaining items again when the server still finds unchecked ones', async () => {
    const { onFeedback, onProceed, repository, user } = setup({ review: makeReview(false) })
    // 첫 조회는 렌더링하면서 끝났다. 이후 재조회에서 서버는 아직 확인할 항목이 있다고 답한다.
    const reload = vi.spyOn(repository, 'getMaskingReview').mockResolvedValue(makeReview(true))
    vi.spyOn(repository, 'confirmMasking').mockRejectedValue(new ApiError('확인하지 않은 항목이 1개 남아 있습니다', { code: 'http', status: 409, serverCode: 'MASKING_REVIEW_INCOMPLETE' }))
    vi.spyOn(repository, 'listFiles').mockResolvedValue([file('review')])

    await waitFor(() => expect(confirmButton()).toBeEnabled())
    await user.click(confirmButton())
    await user.click(screen.getByRole('button', { name: '확정하고 분석 시작' }))

    await waitFor(() => expect(onFeedback).toHaveBeenCalledWith('확인하지 않은 항목이 1개 남아 있습니다'))
    expect(reload).toHaveBeenCalledWith(HANDOVER_ID, 'file-1')
    expect(await screen.findByText('확인이 필요한 항목 1개를 먼저 확인해 주세요')).toBeInTheDocument()
    expect(confirmButton()).toBeDisabled()
    expect(onProceed).not.toHaveBeenCalled()
  })

  it('lets the flow continue when no file needs review', async () => {
    const { onProceed, user } = setup({ attachments: [file('ready')] })

    expect(screen.getByRole('heading', { name: '검수할 민감정보가 없어요' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /AI 분석 시작/ }))

    expect(onProceed).toHaveBeenCalledTimes(1)
  })

  it('waits for files that are still being read', () => {
    setup({ attachments: [file('processing')] })

    expect(screen.getByText('아직 파일을 읽고 있어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /AI 분석 시작/ })).toBeDisabled()
  })
})
