import { ApiError, apiRequest } from '@/shared/api'
import { RepositoryError } from '@/shared/lib/async'

import type {
  AnalysisJob,
  CreateHandoverInput,
  Handover,
  HandoverAnswer,
  HandoverAttachment,
  HandoverDocument,
  HandoverId,
  HandoverParticipant,
  HandoverSummary,
  InterviewQuestion,
  ReviewComment,
  ReviewSummary,
  UpdateHandoverInput,
} from '../model/types'
import type { AnalysisJobResponse, ClarificationQuestionResponse, CreateHandoverRequest, FileMetadataResponse, FileUploadResponse, HandoverResponse, HandoverDraftResponse, ChecklistItemInput, CommentRequest, CommentResponse, HandoverListResponse, MemberPageResponse, QuestionAnswerRequest, ReviewChecklistRequest, ReviewDetailResponse, UpdateDraftRequest } from './dto/types'
import type { HandoverRepository } from './HandoverRepository'
import { toDraftContent, toHandoverDocument } from './mapper/documentMapper'
import { formatListDate, toReceivedSummary, toReviewComment, toReviewSummary } from './mapper/receivedMapper'
import { toAnalysisJob, toHandoverStatus, toInterviewQuestion, toAttachmentStatus, toHandoverAttachment, toHandoverParticipant, toParticipantFromDto } from './mapper/handoverMapper'
import { MockHandoverRepository } from './mock/MockHandoverRepository'

function formatUpdatedAt(value: string | undefined) {
  if (!value) return ''
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? ''
    : `${parsed.getFullYear()}. ${String(parsed.getMonth() + 1).padStart(2, '0')}. ${String(parsed.getDate()).padStart(2, '0')}.`
}

/**
 * 실제 API로 옮긴 기능만 서버를 호출하고, 아직 옮기지 않은 기능은 목업에 위임한다.
 * 목업에는 실제 인수인계 id를 seed해 두기 때문에 연동 도중에도 생성 흐름이 끊기지 않는다.
 */
export class HttpHandoverRepository implements HandoverRepository {
  private readonly pending = new MockHandoverRepository()
  private members: HandoverParticipant[] = []

  async listMembers(): Promise<HandoverParticipant[]> {
    const page = await apiRequest<MemberPageResponse>('/api/v1/members')
    this.members = page.items.map(toHandoverParticipant)
    return this.members
  }

  async createDraft(input: CreateHandoverInput): Promise<Handover> {
    const workItems = input.workItems.map((item) => item.trim()).filter(Boolean)
    if (input.recipientIds.length === 0 || workItems.length === 0) {
      throw new RepositoryError('VALIDATION', '받는 사람과 업무를 한 개 이상 입력해 주세요.')
    }

    const body: CreateHandoverRequest = {
      title: workItems.join(' · '),
      recipientIds: input.recipientIds,
      reviewerIds: input.reviewerIds,
      workScopes: workItems.map((title) => ({ title })),
    }
    const created = await apiRequest<HandoverResponse>('/api/v1/handovers', {
      body: JSON.stringify(body),
      method: 'POST',
    })

    const recipients = created.participants
      .filter((participant) => participant.role === 'RECIPIENT')
      .map(toParticipantFromDto)
    const fallback = input.recipientIds.map((id) => this.members.find((member) => member.id === id)
      ?? { id, name: '받는 사람', position: '', team: '' })
    return this.pending.seedDraft(
      created.id,
      toHandoverParticipant({ id: created.owner.id, name: created.owner.name, team: created.owner.team, position: created.owner.position }),
      recipients.length > 0 ? recipients : fallback,
      workItems,
    )
  }

  async listFiles(id: HandoverId): Promise<HandoverAttachment[]> {
    const files = await apiRequest<FileMetadataResponse[]>(`/api/v1/handovers/${id}/files`)
    return files.map(toHandoverAttachment)
  }

  async uploadFile(id: HandoverId, file: File): Promise<HandoverAttachment> {
    const form = new FormData()
    form.append('file', file)
    const uploaded = await apiRequest<FileUploadResponse>(`/api/v1/handovers/${id}/files`, {
      body: form,
      method: 'POST',
    })
    return {
      id: uploaded.sourceDocumentId,
      name: uploaded.fileName,
      mimeType: file.type,
      size: file.size,
      status: toAttachmentStatus(uploaded.status),
    }
  }

  async deleteFile(id: HandoverId, fileId: string): Promise<void> {
    await apiRequest<void>(`/api/v1/handovers/${id}/files/${fileId}`, { method: 'DELETE' })
  }

  async startAnalysis(id: HandoverId): Promise<AnalysisJob> {
    try {
      return toAnalysisJob(await apiRequest<AnalysisJobResponse>(`/api/v1/handovers/${id}/analysis`, { method: 'POST' }))
    } catch (caught) {
      // 이미 돌고 있는 작업이면 새로 시작할 필요 없이 현재 상태를 따라간다.
      if (caught instanceof ApiError && caught.status === 409) return this.getAnalysis(id)
      throw caught
    }
  }

  async getAnalysis(id: HandoverId): Promise<AnalysisJob> {
    return toAnalysisJob(await apiRequest<AnalysisJobResponse>(`/api/v1/handovers/${id}/analysis`))
  }

  async retryAnalysis(id: HandoverId): Promise<AnalysisJob> {
    return toAnalysisJob(await apiRequest<AnalysisJobResponse>(`/api/v1/handovers/${id}/analysis/retry`, { method: 'POST' }))
  }

  async listQuestions(id: HandoverId): Promise<InterviewQuestion[]> {
    const questions = await apiRequest<ClarificationQuestionResponse[]>(`/api/v1/handovers/${id}/questions`)
    return questions.map(toInterviewQuestion)
  }

  answerQuestion(id: HandoverId, questionId: string, answer: string): Promise<void> {
    const body: QuestionAnswerRequest = { answer, skipped: false }
    return apiRequest<void>(`/api/v1/handovers/${id}/questions/${questionId}/answer`, {
      body: JSON.stringify(body),
      method: 'PUT',
    })
  }

  skipQuestion(id: HandoverId, questionId: string): Promise<void> {
    // 건너뛸 때 answer를 함께 보내면 서버 검증에 걸린다. 빈 문자열도 안 된다.
    const body: QuestionAnswerRequest = { skipped: true }
    return apiRequest<void>(`/api/v1/handovers/${id}/questions/${questionId}/answer`, {
      body: JSON.stringify(body),
      method: 'PUT',
    })
  }

  async completeQuestions(id: HandoverId): Promise<void> {
    await apiRequest<unknown>(`/api/v1/handovers/${id}/questions/complete`, { method: 'POST' })
  }

  async getDocument(id: HandoverId): Promise<HandoverDocument> {
    const [draft, handover] = await Promise.all([
      apiRequest<HandoverDraftResponse>(`/api/v1/handovers/${id}/document`),
      apiRequest<HandoverResponse>(`/api/v1/handovers/${id}`),
    ])
    const recipientNames = handover.participants
      .filter((participant) => participant.role === 'RECIPIENT')
      .map((participant) => participant.name)
      .filter(Boolean)
    return toHandoverDocument(draft.content ?? {}, {
      title: handover.title?.trim() || '업무 인수인계',
      intro: `${handover.owner.name}님의 업무를 ${recipientNames.join(', ') || '인수자'}님에게 전달합니다.`,
      scope: handover.workScopes.map((scope) => scope.title).filter(Boolean).join(' · '),
      statusLabel: 'AI 초안 · 확인 중',
      updatedAtLabel: formatUpdatedAt(draft.updatedAt),
    })
  }

  async saveDocument(id: HandoverId, document: HandoverDocument): Promise<void> {
    const body: UpdateDraftRequest = { content: toDraftContent(document) }
    await apiRequest<HandoverDraftResponse>(`/api/v1/handovers/${id}/document`, {
      body: JSON.stringify(body),
      method: 'PATCH',
    })
  }

  async listReceivedHandovers(): Promise<HandoverSummary[]> {
    const page = await apiRequest<HandoverListResponse>('/api/v1/handovers/received')
    return (page.items ?? []).map((item) => toReceivedSummary(item))
  }

  /** 상세 화면이 쓰는 정보는 인수인계 단건과 검토 응답 두 곳에 나뉘어 있다. */
  async getHandover(id: HandoverId): Promise<Handover> {
    const [handover, review] = await Promise.all([
      apiRequest<HandoverResponse>(`/api/v1/handovers/${id}`),
      apiRequest<ReviewDetailResponse>(`/api/v1/handovers/${id}/review`),
    ])
    const recipients = handover.participants.filter((participant) => participant.role === 'RECIPIENT').map(toParticipantFromDto)
    const owner = toHandoverParticipant(handover.owner)
    const document = toHandoverDocument(review.document?.content ?? {}, {
      title: handover.title?.trim() || '업무 인수인계',
      intro: `${owner.name}님의 업무를 ${recipients.map((person) => person.name).join(', ') || '인수자'}님에게 전달합니다.`,
      scope: handover.workScopes.map((scope) => scope.title).filter(Boolean).join(' · '),
      statusLabel: handover.status === 'COMPLETED' ? '전달 완료 · 최신 버전' : 'AI 초안 · 확인 중',
      updatedAtLabel: formatUpdatedAt(review.document?.updatedAt ?? handover.updatedAt),
    })
    const firstSchedule = document.schedule[0]
    return {
      id: handover.id,
      title: document.title,
      owner,
      recipient: recipients[0] ?? owner,
      recipients,
      team: owner.team,
      status: toHandoverStatus(handover.status),
      deliveredAtLabel: formatListDate(handover.submittedAt ?? handover.updatedAt),
      attachments: (review.attachments ?? []).map(toHandoverAttachment),
      document,
      interviewQuestions: [],
      review: {
        checklist: (review.checklist ?? []).map((item) => ({ id: item.id, label: item.label, checked: item.checked })),
        comments: (review.comments ?? []).map((comment) => toReviewComment(comment)),
      },
      firstSchedule: {
        dayLabel: firstSchedule?.cycle ?? '첫 주',
        time: '',
        title: firstSchedule?.task ?? document.checklist[0] ?? '문서를 먼저 확인해 주세요',
        description: firstSchedule?.detail ?? document.purpose,
      },
    }
  }

  async acknowledgeHandover(id: HandoverId): Promise<void> {
    await apiRequest<HandoverResponse>(`/api/v1/handovers/${id}/acknowledge`, { method: 'POST' })
  }

  async completeHandover(id: HandoverId): Promise<Handover> {
    await apiRequest<HandoverResponse>(`/api/v1/handovers/${id}/complete`, { method: 'POST' })
    return this.getHandover(id)
  }

  updateDraft(id: HandoverId, changes: UpdateHandoverInput): Promise<Handover> {
    return this.pending.updateDraft(id, changes)
  }

  /** 서버는 상태만 바꿔 주므로, 화면이 쓰는 나머지 정보는 현재 초안에서 가져온다. 재호출해도 멱등이다. */
  async submitHandover(id: HandoverId): Promise<Handover> {
    const submitted = await apiRequest<HandoverResponse>(`/api/v1/handovers/${id}/submit`, { method: 'POST' })
    const current = await this.pending.getHandover(id)
    return { ...current, status: toHandoverStatus(submitted.status) }
  }

  askQuestion(id: HandoverId, question: string): Promise<HandoverAnswer> {
    return this.pending.askQuestion(id, question)
  }

  async listReviews(): Promise<ReviewSummary[]> {
    const page = await apiRequest<HandoverListResponse>('/api/v1/handovers/reviews')
    return (page.items ?? []).map((item) => toReviewSummary(item))
  }

  async addReviewComment(id: HandoverId, comment: string): Promise<ReviewComment> {
    const body: CommentRequest = { content: comment }
    const created = await apiRequest<CommentResponse>(`/api/v1/handovers/${id}/comments`, {
      body: JSON.stringify(body),
      method: 'POST',
    })
    return toReviewComment(created)
  }

  /** 체크리스트는 통째로 교체된다. 승인하려면 비어 있지 않고 전부 체크돼 있어야 한다. */
  async saveReviewChecklist(id: HandoverId, items: ChecklistItemInput[]): Promise<void> {
    const body: ReviewChecklistRequest = { items }
    await apiRequest<unknown>(`/api/v1/handovers/${id}/review/checklist`, {
      body: JSON.stringify(body),
      method: 'PATCH',
    })
  }

  async requestRevision(id: HandoverId): Promise<Handover> {
    await apiRequest<HandoverResponse>(`/api/v1/handovers/${id}/request-revision`, { method: 'POST' })
    return this.getHandover(id)
  }

  async approveHandover(id: HandoverId): Promise<Handover> {
    await apiRequest<HandoverResponse>(`/api/v1/handovers/${id}/approve`, { method: 'POST' })
    return this.getHandover(id)
  }
}
