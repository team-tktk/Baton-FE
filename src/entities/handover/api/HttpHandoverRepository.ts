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
import type { AnalysisJobResponse, ClarificationQuestionResponse, CreateHandoverRequest, FileMetadataResponse, FileUploadResponse, HandoverResponse, HandoverDraftResponse, MemberPageResponse, QuestionAnswerRequest, UpdateDraftRequest } from './dto/types'
import type { HandoverRepository } from './HandoverRepository'
import { toDraftContent, toHandoverDocument } from './mapper/documentMapper'
import { toAnalysisJob, toInterviewQuestion, toAttachmentStatus, toHandoverAttachment, toHandoverParticipant, toParticipantFromDto } from './mapper/handoverMapper'
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

  listReceivedHandovers(): Promise<HandoverSummary[]> {
    return this.pending.listReceivedHandovers()
  }

  getHandover(id: HandoverId): Promise<Handover> {
    return this.pending.getHandover(id)
  }

  updateDraft(id: HandoverId, changes: UpdateHandoverInput): Promise<Handover> {
    return this.pending.updateDraft(id, changes)
  }

  submitHandover(id: HandoverId): Promise<Handover> {
    return this.pending.submitHandover(id)
  }

  askQuestion(id: HandoverId, question: string): Promise<HandoverAnswer> {
    return this.pending.askQuestion(id, question)
  }

  listReviews(): Promise<ReviewSummary[]> {
    return this.pending.listReviews()
  }

  addReviewComment(id: HandoverId, comment: string): Promise<ReviewComment> {
    return this.pending.addReviewComment(id, comment)
  }

  requestRevision(id: HandoverId): Promise<Handover> {
    return this.pending.requestRevision(id)
  }

  approveHandover(id: HandoverId): Promise<Handover> {
    return this.pending.approveHandover(id)
  }
}
