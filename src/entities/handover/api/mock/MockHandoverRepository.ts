import { RepositoryError } from '@/shared/lib/async'

import type { HandoverRepository } from '../HandoverRepository'
import type {
  AnalysisJob,
  CreateHandoverInput,
  Handover,
  HandoverAnswer,
  HandoverAttachment,
  HandoverChatExchange,
  HandoverDocument,
  HandoverFileDownload,
  HandoverId,
  HandoverParticipant,
  HandoverSummary,
  InterviewQuestion,
  ReviewComment,
  ReviewSummary,
  SentSummary,
  UpdateHandoverInput,
} from '../../model/types'
import { memberFixtures } from './fixtures/members'
import { primaryHandoverFixture, receivedHandoverFixtures } from './fixtures/handovers'
import { fallbackQaResponse, qaResponseRules } from './fixtures/qa-responses'
import { reviewSummaryFixtures } from './fixtures/reviews'
import { sentSummaryFixtures } from './fixtures/sent'
import { commentFixtures } from './fixtures/comments'

const clone = <T,>(value: T): T => structuredClone(value)

export class MockHandoverRepository implements HandoverRepository {
  private readonly members = clone(memberFixtures)
  private readonly handovers = new Map<HandoverId, Handover>([
    [primaryHandoverFixture.id, clone(primaryHandoverFixture)],
  ])
  private readonly received = clone(receivedHandoverFixtures)
  private readonly reviews = clone(reviewSummaryFixtures)
  private readonly sent = clone(sentSummaryFixtures)
  private analysisProgress = 0

  async listMembers(): Promise<HandoverParticipant[]> {
    return clone(this.members)
  }

  async listReceivedHandovers(): Promise<HandoverSummary[]> {
    return clone(this.received)
  }

  async listSentHandovers(): Promise<SentSummary[]> {
    return clone(this.sent)
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
  seedDraft(id: HandoverId, owner: HandoverParticipant, recipients: HandoverParticipant[], workItems: string[]): Handover {
    const draft = clone(primaryHandoverFixture)
    draft.id = id
    draft.status = 'draft'
    draft.owner = clone(owner)
    if (owner.team) draft.team = owner.team
    draft.recipients = clone(recipients)
    if (recipients[0]) draft.recipient = clone(recipients[0])
    // 첨부는 실제 파일 목록으로 채워지므로 픽스처를 남기지 않는다.
    draft.attachments = []
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
    draft.recipients = [clone(recipient)]
    draft.document.scope = workItems.join(' · ')
    this.handovers.set(draft.id, draft)
    this.syncSummaries(draft)
    return clone(draft)
  }

  async listFiles(id: HandoverId): Promise<HandoverAttachment[]> {
    const handover = await this.getMutable(id)
    return clone(handover.attachments)
  }

  async uploadFile(id: HandoverId, file: File): Promise<HandoverAttachment> {
    const handover = await this.getMutable(id)
    const attachment: HandoverAttachment = {
      id: `attachment-${handover.attachments.length + 1}-${file.name}`,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      status: 'ready',
    }
    handover.attachments.push(attachment)
    this.syncSummaries(handover)
    return clone(attachment)
  }

  async deleteFile(id: HandoverId, fileId: string): Promise<void> {
    const handover = await this.getMutable(id)
    handover.attachments = handover.attachments.filter((file) => file.id !== fileId)
    this.syncSummaries(handover)
  }

  async downloadFile(id: HandoverId, fileId: string): Promise<HandoverFileDownload> {
    const handover = await this.getMutable(id)
    const file = handover.attachments.find((attachment) => attachment.id === fileId)
    if (!file) throw new RepositoryError('NOT_FOUND', '파일을 찾을 수 없어요.')
    // 목업에는 실제 바이트가 없으므로 파일명이 담긴 자리표시 텍스트를 내려준다.
    const blob = new Blob([`Mock file: ${file.name}`], { type: file.mimeType || 'application/octet-stream' })
    return { blob, filename: file.name }
  }

  async startAnalysis(id: HandoverId): Promise<AnalysisJob> {
    const handover = await this.getMutable(id)
    if (handover.attachments.length === 0) {
      throw new RepositoryError('VALIDATION', '분석할 파일이 없어요. 파일을 먼저 올려주세요.')
    }
    this.analysisProgress = 0
    return { status: 'running', progress: 0, currentStep: '업무 자료를 읽는 중', error: null }
  }

  async getAnalysis(id: HandoverId): Promise<AnalysisJob> {
    await this.getMutable(id)
    this.analysisProgress = Math.min(100, this.analysisProgress + 50)
    return this.analysisProgress >= 100
      ? { status: 'completed', progress: 100, currentStep: '초안 준비 완료', error: null }
      : { status: 'running', progress: this.analysisProgress, currentStep: '반복 업무를 정리하는 중', error: null }
  }

  async retryAnalysis(id: HandoverId): Promise<AnalysisJob> {
    return this.startAnalysis(id)
  }

  async listQuestions(id: HandoverId): Promise<InterviewQuestion[]> {
    const handover = await this.getMutable(id)
    return clone(handover.interviewQuestions)
  }

  async answerQuestion(id: HandoverId, questionId: string, answer: string): Promise<void> {
    const question = (await this.getMutable(id)).interviewQuestions.find((item) => item.id === questionId)
    if (!question) throw new RepositoryError('NOT_FOUND', '질문을 찾을 수 없어요.')
    if (!answer.trim()) throw new RepositoryError('VALIDATION', '답변을 입력해 주세요.')
    question.status = 'answered'
    question.answer = answer.trim()
  }

  async skipQuestion(id: HandoverId, questionId: string): Promise<void> {
    const question = (await this.getMutable(id)).interviewQuestions.find((item) => item.id === questionId)
    if (!question) throw new RepositoryError('NOT_FOUND', '질문을 찾을 수 없어요.')
    question.status = 'skipped'
    question.answer = null
  }

  async completeQuestions(id: HandoverId): Promise<void> {
    const handover = await this.getMutable(id)
    if (handover.interviewQuestions.some((question) => question.status === 'pending')) {
      throw new RepositoryError('VALIDATION', '아직 답하지 않은 질문이 있어요.')
    }
  }

  async getDocument(id: HandoverId): Promise<HandoverDocument> {
    return clone((await this.getMutable(id)).document)
  }

  async saveDocument(id: HandoverId, document: HandoverDocument): Promise<void> {
    const handover = await this.getMutable(id)
    handover.document = clone(document)
    this.syncSummaries(handover)
  }

  async acknowledgeHandover(id: HandoverId): Promise<void> {
    const handover = await this.getMutable(id)
    if (handover.status === 'submitted') this.changeStatusOf(handover, 'in-progress')
  }

  async completeHandover(id: HandoverId): Promise<Handover> {
    return this.changeStatus(id, 'completed')
  }

  async updateDraft(id: HandoverId, changes: UpdateHandoverInput): Promise<Handover> {
    const handover = await this.getMutable(id)
    if (changes.attachments) handover.attachments = clone(changes.attachments)
    if (changes.document) handover.document = { ...handover.document, ...clone(changes.document) }
    if (changes.workItems) handover.document.scope = changes.workItems.map((item) => item.trim()).filter(Boolean).join(' · ')
    if (changes.recipientIds) {
      const recipient = this.members.find((member) => changes.recipientIds!.includes(member.id))
      if (recipient) {
        handover.recipient = clone(recipient)
        handover.recipients = [clone(recipient)]
      }
    }
    this.syncSummaries(handover)
    return clone(handover)
  }

  async submitHandover(id: HandoverId): Promise<Handover> {
    return this.changeStatus(id, 'submitted')
  }

  async listChatMessages(): Promise<HandoverChatExchange[]> {
    return []
  }

  async listSuggestedQuestions(): Promise<string[]> {
    return ['첫날 가장 먼저 할 일은?', '배송 답변이 늦으면 누구에게 물어봐요?']
  }

  async askQuestion(_id: HandoverId, question: string): Promise<HandoverAnswer> {
    const value = question.trim()
    if (!value) throw new RepositoryError('VALIDATION', '질문을 입력해 주세요.')
    const match = qaResponseRules.find((rule) => rule.keywords.some((keyword) => value.includes(keyword)))
    if (!match) return clone(fallbackQaResponse)
    return clone({
      text: match.text,
      grounded: true,
      citations: [{ sourceId: match.source, title: match.source, locator: '' }],
    })
  }

  async listReviews(): Promise<ReviewSummary[]> {
    return clone(this.reviews)
  }

  async listComments(id: HandoverId): Promise<ReviewComment[]> {
    return clone(commentFixtures[id] ?? [])
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

  async saveReviewChecklist(id: HandoverId, items: Array<{ label: string; checked: boolean }>): Promise<void> {
    const handover = await this.getMutable(id)
    handover.review.checklist = items.map((item, index) => ({ id: `check-${index}`, label: item.label, checked: item.checked }))
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
    this.changeStatusOf(handover, status)
    return clone(handover)
  }

  private changeStatusOf(handover: Handover, status: Handover['status']) {
    handover.status = status
    this.syncSummaries(handover)
  }

  private syncSummaries(handover: Handover) {
    const received = this.received.find((item) => item.id === handover.id)
    if (received) {
      received.scope = handover.document.scope
      received.status = handover.status
      received.statusLabel = handover.status === 'completed' ? '확인 완료' : handover.status === 'in-progress' ? '진행 중' : '확인 전'
      received.files = handover.attachments.length
    }
    const review = this.reviews.find((item) => item.id === handover.id)
    if (review) {
      review.status = handover.status
      review.statusLabel =
        handover.status === 'approved' || handover.status === 'completed' ? '승인 완료' : '승인 대기'
    }
  }
}
