import { apiRequest } from '@/shared/api'
import { RepositoryError } from '@/shared/lib/async'

import type {
  CreateHandoverInput,
  Handover,
  HandoverAnswer,
  HandoverAttachment,
  HandoverId,
  HandoverParticipant,
  HandoverSummary,
  ReviewComment,
  ReviewSummary,
  UpdateHandoverInput,
} from '../model/types'
import type { CreateHandoverRequest, FileMetadataResponse, FileUploadResponse, HandoverResponse, MemberPageResponse } from './dto/types'
import type { HandoverRepository } from './HandoverRepository'
import { toAttachmentStatus, toHandoverAttachment, toHandoverParticipant, toParticipantFromDto } from './mapper/handoverMapper'
import { MockHandoverRepository } from './mock/MockHandoverRepository'

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

    const recipient = created.participants.find((participant) => participant.role === 'RECIPIENT')
    const seedRecipient = recipient
      ? toParticipantFromDto(recipient)
      : this.members.find((member) => member.id === input.recipientIds[0])
        ?? { id: input.recipientIds[0], name: '받는 사람', position: '', team: '' }
    return this.pending.seedDraft(created.id, seedRecipient, workItems)
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
