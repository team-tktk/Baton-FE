import { useState } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

/** 원문 일반 구간 하나 안에서 글자를 고른다. 실제 드래그처럼 선택 영역을 만든다. */
function selectInSegment(region: HTMLElement, segmentIndex: number, from: number, to: number) {
  const segment = region.querySelectorAll('[data-text-segment]')[segmentIndex]
  const range = document.createRange()
  range.setStart(segment.firstChild!, from)
  range.setEnd(segment.firstChild!, to)
  const selection = window.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
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
    expect(dialog).toHaveTextContent('현재 마스킹된 상태로 서버에 업로드돼요')
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

  it('masks a dragged range and removes it again', async () => {
    const { repository, user } = setup({ review: makeReview(false) })
    const add = vi.spyOn(repository, 'addMaskingCandidate')
    const remove = vi.spyOn(repository, 'removeMaskingCandidate')
    const region = await screen.findByRole('region', { name: '업무협약서.docx 추출 텍스트' })

    // 두 번째 일반 구간은 "\n지급 계좌: "다. "지급 계좌"만 고른다.
    selectInSegment(region, 1, 1, 6)
    fireEvent.mouseUp(region)
    await user.click(screen.getByRole('button', { name: '이 부분 가리기' }))

    const emailEnd = TEXT.indexOf(EMAIL) + EMAIL.length
    expect(add).toHaveBeenCalledWith(HANDOVER_ID, 'file-1', { start: emailEnd + 1, end: emailEnd + 6 })
    expect(TEXT.slice(emailEnd + 1, emailEnd + 6)).toBe('지급 계좌')
    const removeButton = await screen.findByRole('button', { name: '직접 추가한 *** 삭제' })
    expect(screen.queryByRole('button', { name: '이 부분 가리기' })).not.toBeInTheDocument()

    await user.click(removeButton)

    expect(remove).toHaveBeenCalledWith(HANDOVER_ID, 'file-1', 'manual-3')
    await waitFor(() => expect(screen.queryByRole('button', { name: '직접 추가한 *** 삭제' })).not.toBeInTheDocument())
  })

  it('offers the action for a touch selection that never sends mouseup', async () => {
    setup({ review: makeReview(false) })
    const region = await screen.findByRole('region', { name: '업무협약서.docx 추출 텍스트' })

    // 휴대폰은 길게 눌러 고르고 핸들로 조정한다. 선택 변경 이벤트만 온다.
    selectInSegment(region, 1, 1, 6)
    document.dispatchEvent(new Event('selectionchange'))

    expect(await screen.findByRole('button', { name: '이 부분 가리기' })).toBeInTheDocument()
  })

  it('explains instead of sending a range that overlaps a found item', async () => {
    const { repository } = setup({ review: makeReview(false) })
    const add = vi.spyOn(repository, 'addMaskingCandidate')
    const region = await screen.findByRole('region', { name: '업무협약서.docx 추출 텍스트' })

    // 첫 구간 시작부터 이메일을 건너 두 번째 구간까지 고른다.
    const [first, second] = region.querySelectorAll('[data-text-segment]')
    const range = document.createRange()
    range.setStart(first.firstChild!, 0)
    range.setEnd(second.firstChild!, 3)
    window.getSelection()!.removeAllRanges()
    window.getSelection()!.addRange(range)
    fireEvent.mouseUp(region)

    expect(screen.getByRole('status')).toHaveTextContent('이미 표시된 항목과 겹쳐요')
    expect(screen.queryByRole('button', { name: '이 부분 가리기' })).not.toBeInTheDocument()
    expect(add).not.toHaveBeenCalled()
  })

  it('lets the flow continue when no file needs review', async () => {
    const { onProceed, user } = setup({ attachments: [file('ready')] })

    expect(screen.getByRole('heading', { name: '검수할 민감정보가 없어요' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /AI 분석 시작/ }))

    expect(onProceed).toHaveBeenCalledTimes(1)
  })

  it('reviews a web link like a file and bundles Slack messages with nothing found', async () => {
    const repository = new MockHandoverRepository()
    const web: HandoverAttachment = { id: 'web-1', name: '정산 위키', mimeType: '', size: 0, status: 'review', origin: 'web-link', detail: 'https://wiki.example.com' }
    const slack = (id: string, text: string): HandoverAttachment => ({ id, name: text, mimeType: '', size: 0, status: 'review', origin: 'slack', detail: '#운영팀' })
    repository.externalSources.push(web, slack('slack-1', '넵 확인했습니다'), slack('slack-2', '내일 오전에 공유할게요'))
    repository.maskingReviews.set('web-1', { ...makeReview(true), fileId: 'web-1', fileName: '정산 위키' })
    for (const [id, text] of [['slack-1', '넵 확인했습니다'], ['slack-2', '내일 오전에 공유할게요']]) {
      repository.maskingReviews.set(id!, { fileId: id!, fileName: text!, status: 'review', confirmed: false, text: text!, summary: summarizeMasking([]), candidates: [] })
    }
    const confirmMasking = vi.spyOn(repository, 'confirmMasking')
    const onProceed = vi.fn()
    const user = userEvent.setup()
    function Harness() {
      const [files, setFiles] = useState<HandoverAttachment[]>([])
      return <MaskingStep attachments={files} handoverId={HANDOVER_ID} onAttachmentsChange={setFiles} onBack={vi.fn()} onFeedback={vi.fn()} onProceed={onProceed} />
    }
    render(<HandoverRepositoryProvider repository={repository}><Harness /></HandoverRepositoryProvider>)

    const group = within(await screen.findByRole('group', { name: '검수할 자료' }))
    expect(group.getByRole('button', { name: /정산 위키/ })).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByRole('region', { name: '정산 위키 추출 텍스트' })).toHaveTextContent('min***@example.com')

    await user.click(group.getByRole('button', { name: /민감정보를 찾지 못한 자료/ }))
    const bundle = within(screen.getByRole('region', { name: '민감정보를 찾지 못한 자료' }))
    expect(bundle.getAllByRole('listitem')).toHaveLength(2)
    expect(bundle.getByText('내일 오전에 공유할게요', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '찾은 민감정보 요약' })).toHaveTextContent('Slack 메시지 2개에서')

    // 묶음에는 확인할 것이 없고, 웹 링크의 확인 필요 항목만 남아 있다.
    expect(confirmButton()).toBeDisabled()
    await user.click(group.getByRole('button', { name: /정산 위키/ }))
    await user.click(accountCheckbox())
    await waitFor(() => expect(confirmButton()).toBeEnabled())
    await user.click(confirmButton())
    expect(screen.getByRole('dialog', { name: '민감정보 검수를 확정할까요?' })).toHaveTextContent('현재 마스킹된 상태로 서버에 업로드돼요')
    await user.click(screen.getByRole('button', { name: '확정하고 분석 시작' }))

    await waitFor(() => expect(onProceed).toHaveBeenCalledTimes(1))
    expect(confirmMasking.mock.calls.map((call) => call[1])).toEqual(['web-1', 'slack-1', 'slack-2'])
  })

  it('shows the bundle directly when only clean web or Slack sources wait', async () => {
    const repository = new MockHandoverRepository()
    repository.externalSources.push({ id: 'slack-1', name: '넵', mimeType: '', size: 0, status: 'review', origin: 'slack', detail: '#운영팀' })
    repository.maskingReviews.set('slack-1', { fileId: 'slack-1', fileName: '넵', status: 'review', confirmed: false, text: '넵', summary: summarizeMasking([]), candidates: [] })
    render(<HandoverRepositoryProvider repository={repository}><MaskingStep attachments={[]} handoverId={HANDOVER_ID} onAttachmentsChange={vi.fn()} onBack={vi.fn()} onFeedback={vi.fn()} onProceed={vi.fn()} /></HandoverRepositoryProvider>)

    expect(await screen.findByRole('region', { name: '민감정보를 찾지 못한 자료' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: '검수할 자료' })).not.toBeInTheDocument()
    await waitFor(() => expect(confirmButton()).toBeEnabled())
  })

  it('waits for files that are still being read', () => {
    setup({ attachments: [file('processing')] })

    expect(screen.getByText('아직 자료를 읽고 있어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /AI 분석 시작/ })).toBeDisabled()
  })
})
