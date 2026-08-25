import { RepositoryError } from '@/shared/lib/async'

import type { HandoverRepository } from '../HandoverRepository'
import type {
  CreateHandoverInput,
  Handover,
  HandoverAnswer,
  HandoverId,
  HandoverParticipant,
  HandoverSummary,
  ReviewComment,
  ReviewSummary,
  UpdateHandoverInput,
} from '../../model/types'
import { memberFixtures } from './fixtures/members'
import { primaryHandoverFixture, receivedHandoverFixtures } from './fixtures/handovers'
import { fallbackQaResponse, qaResponseRules } from './fixtures/qa-responses'
import { reviewSummaryFixtures } from './fixtures/reviews'

const clone = <T,>(value: T): T => structuredClone(value)

export class MockHandoverRepository implements HandoverRepository {
  private readonly members = clone(memberFixtures)
  private readonly handovers = new Map<HandoverId, Handover>([
    [primaryHandoverFixture.id, clone(primaryHandoverFixture)],
  ])
  private readonly received = clone(receivedHandoverFixtures)
  private readonly reviews = clone(reviewSummaryFixtures)

  async listMembers(): Promise<HandoverParticipant[]> {
    return clone(this.members)
  }

  async listReceivedHandovers(): Promise<HandoverSummary[]> {
    return clone(this.received)
  }

  async getHandover(id: HandoverId): Promise<Handover> {
    const handover = this.handovers.get(id)
    if (!handover) {
      if (id === 'handover-cs-support' || id === 'handover-monthly-settlement') {
        return clone({ ...primaryHandoverFixture, id })
      }
      throw new RepositoryError('NOT_FOUND', '인수인계를 찾을 수 없어요.')
    }
    return clone(handover)
  }

  /**
   * 실제 API가 만든 인수인계 id에 아직 연동되지 않은 화면용 목업 내용을 붙여 둔다.
   * 알 수 없는 id는 계속 NOT_FOUND로 남겨 잘못된 경로 처리를 유지한다.
   */
  seedDraft(id: HandoverId, recipient: HandoverParticipant, workItems: string[]): Handover {
    const draft = clone(primaryHandoverFixture)
    draft.id = id
    draft.status = 'draft'
    draft.recipient = clone(recipient)
    if (workItems.length > 0) draft.document.scope = workItems.join(' · ')
    this.handovers.set(id, draft)
    return clone(draft)
  }

  async createDraft(input: CreateHandoverInput): Promise<Handover> {
    const workItems = input.workItems.map((item) => item.trim()).filter(Boolean)
    const recipient = this.members.find((member) => input.recipientIds.includes(member.id))
    if (!recipient || workItems.length === 0) {
      throw new RepositoryError('VALIDATION', '받는 사람과 업무를 한 개 이상 입력해 주세요.')
    }

    const draft = clone(primaryHandoverFixture)
    draft.status = 'draft'
    draft.recipient = clone(recipient)
    draft.document.scope = workItems.join(' · ')
    this.handovers.set(draft.id, draft)
    this.syncSummaries(draft)
    return clone(draft)
  }

  async updateDraft(id: HandoverId, changes: UpdateHandoverInput): Promise<Handover> {
    const handover = await this.getMutable(id)
    if (changes.attachments) handover.attachments = clone(changes.attachments)
    if (changes.document) handover.document = { ...handover.document, ...clone(changes.document) }
    if (changes.workItems) handover.document.scope = changes.workItems.map((item) => item.trim()).filter(Boolean).join(' · ')
    if (changes.recipientIds) {
      const recipient = this.members.find((member) => changes.recipientIds!.includes(member.id))
      if (recipient) handover.recipient = clone(recipient)
    }
    this.syncSummaries(handover)
    return clone(handover)
  }

  async submitHandover(id: HandoverId): Promise<Handover> {
    return this.changeStatus(id, 'submitted')
  }

  async askQuestion(id: HandoverId, question: string): Promise<HandoverAnswer> {
    await this.getMutable(id)
    const value = question.trim()
    if (!value) throw new RepositoryError('VALIDATION', '질문을 입력해 주세요.')
    const match = qaResponseRules.find((rule) => rule.keywords.some((keyword) => value.includes(keyword)))
    return clone(match ? { text: match.text, source: match.source } : fallbackQaResponse)
  }

  async listReviews(): Promise<ReviewSummary[]> {
    return clone(this.reviews)
  }

  async addReviewComment(id: HandoverId, comment: string): Promise<ReviewComment> {
    const handover = await this.getMutable(id)
    const value = comment.trim()
    if (!value) throw new RepositoryError('VALIDATION', '코멘트를 입력해 주세요.')
    const reviewComment: ReviewComment = {
      id: `comment-${handover.review.comments.length + 1}`,
      authorName: '이도현',
      text: value,
      createdAtLabel: '방금 전',
    }
    handover.review.comments.push(reviewComment)
    return clone(reviewComment)
  }

  async requestRevision(id: HandoverId): Promise<Handover> {
    return this.changeStatus(id, 'revision-requested')
  }

  async approveHandover(id: HandoverId): Promise<Handover> {
    return this.changeStatus(id, 'approved')
  }

  private async getMutable(id: HandoverId): Promise<Handover> {
    const handover = this.handovers.get(id)
    if (!handover) throw new RepositoryError('NOT_FOUND', '인수인계를 찾을 수 없어요.')
    return handover
  }

  private async changeStatus(id: HandoverId, status: Handover['status']): Promise<Handover> {
    const handover = await this.getMutable(id)
    handover.status = status
    this.syncSummaries(handover)
    return clone(handover)
  }

  private syncSummaries(handover: Handover) {
    const received = this.received.find((item) => item.id === handover.id)
    if (received) {
      received.scope = handover.document.scope
      received.status = handover.status
      received.statusLabel = handover.status === 'approved' ? '확인 완료' : handover.status === 'in-progress' ? '진행 중' : '확인 전'
      received.files = handover.attachments.length
    }
    const review = this.reviews.find((item) => item.id === handover.id)
    if (review) {
      review.status = handover.status
      review.statusLabel =
        handover.status === 'approved' ? '승인 완료' : handover.status === 'revision-requested' ? '보완 요청' : '승인 대기'
    }
  }
}
