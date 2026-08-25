import type { HandoverStatus, HandoverSummary, ReviewComment, ReviewSummary } from '../../model/types'
import type { CommentResponse, HandoverSummaryResponse } from '../dto/types'

/** 서버 날짜를 목록에서 읽기 쉬운 문구로 바꾼다. 오늘이면 시각만 보여 준다. */
export function formatListDate(value: string | undefined, now = new Date()): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const sameDay = parsed.getFullYear() === now.getFullYear()
    && parsed.getMonth() === now.getMonth()
    && parsed.getDate() === now.getDate()
  const time = `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`
  return sameDay ? `오늘 ${time}` : `${parsed.getMonth() + 1}월 ${parsed.getDate()}일`
}

/**
 * 인수자 관점 상태. 서버는 본 상태(status)와 수신 상태(receiptStatus)를 따로 준다.
 * 완료됐으면 완료, 아직 열어보지 않았으면 확인 전, 그 사이는 진행 중으로 본다.
 */
function toReceivedStatus(summary: HandoverSummaryResponse): HandoverStatus {
  if (summary.status === 'COMPLETED') return 'approved'
  const receipt = summary.receiptStatus?.toUpperCase()
  return !receipt || receipt === 'UNREAD' ? 'submitted' : 'in-progress'
}

const RECEIVED_LABEL: Record<string, { label: string; tone: HandoverSummary['tone'] }> = {
  approved: { label: '확인 완료', tone: 'green' },
  'in-progress': { label: '진행 중', tone: 'yellow' },
  submitted: { label: '확인 전', tone: 'blue' },
}

export function toReceivedSummary(summary: HandoverSummaryResponse, now?: Date): HandoverSummary {
  const status = toReceivedStatus(summary)
  const presentation = RECEIVED_LABEL[status] ?? RECEIVED_LABEL.submitted
  return {
    id: summary.id,
    person: summary.owner?.name ?? '알 수 없음',
    team: summary.owner?.team ?? '',
    scope: summary.workScopeSummary?.trim() || summary.title,
    date: formatListDate(summary.submittedAt ?? summary.updatedAt, now),
    status,
    statusLabel: presentation.label,
    tone: presentation.tone,
    tasks: summary.workScopeCount ?? 0,
    files: summary.fileCount ?? 0,
  }
}

export function toReviewComment(comment: CommentResponse, now?: Date): ReviewComment {
  return {
    id: comment.id,
    authorName: comment.authorName,
    text: comment.content,
    createdAtLabel: formatListDate(comment.createdAt, now) || '방금 전',
  }
}

const REVIEW_LABEL: Record<string, { label: string; tone: ReviewSummary['tone'] }> = {
  approved: { label: '승인 완료', tone: 'green' },
  'revision-requested': { label: '보완 요청', tone: 'yellow' },
  submitted: { label: '승인 대기', tone: 'yellow' },
}

export function toReviewSummary(summary: HandoverSummaryResponse, now?: Date): ReviewSummary {
  const status: HandoverStatus = summary.status === 'APPROVED' || summary.status === 'COMPLETED'
    ? 'approved'
    : summary.status === 'REVISION_REQUESTED' ? 'revision-requested' : 'submitted'
  const presentation = REVIEW_LABEL[status] ?? REVIEW_LABEL.submitted
  return {
    id: summary.id,
    title: summary.title,
    from: summary.owner?.name ?? '알 수 없음',
    team: summary.owner?.team ?? '',
    date: formatListDate(summary.submittedAt ?? summary.updatedAt, now),
    status,
    statusLabel: presentation.label,
    tone: presentation.tone,
    tasks: summary.workScopeCount ?? 0,
    files: summary.fileCount ?? 0,
  }
}
