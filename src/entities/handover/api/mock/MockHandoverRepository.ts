import { ApiError } from '@/shared/api'
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
  HandoverDraft,
  HandoverFileDownload,
  HandoverId,
  HandoverParticipant,
  HandoverReadiness,
  HandoverSummary,
  InterviewQuestion,
  MaskingCandidate,
  MaskingRangeInput,
  MaskingReview,
  ReadinessArea,
  ReadinessAreaResult,
  ReadinessFix,
  ReadinessFixAnswer,
  ReadinessFixApplied,
  ReadinessRubric,
  ReviewComment,
  ReviewSummary,
  SentSummary,
  UpdateHandoverInput,
} from '../../model/types'
import { summarizeMasking } from '../mapper/maskingMapper'
import { applySectionValue, readSectionValue, toDocumentSectionValue, toSectionContent } from '../mapper/readinessMapper'
import { memberFixtures } from './fixtures/members'
import { primaryHandoverFixture, receivedHandoverFixtures } from './fixtures/handovers'
import { fallbackQaResponse, qaResponseRules } from './fixtures/qa-responses'
import { reviewSummaryFixtures } from './fixtures/reviews'
import { sentSummaryFixtures } from './fixtures/sent'
import { commentFixtures } from './fixtures/comments'
import { READINESS_STATUS_LABELS, readinessRubricFixture, weakReadinessAreas } from './fixtures/readiness'

const clone = <T,>(value: T): T => structuredClone(value)

type Section = ReadinessAreaResult['section']

// 서버처럼 오류 코드로 분기할 수 있게 같은 모양의 ApiError를 던진다.
const serverError = (status: number, serverCode: string, message: string) =>
  new ApiError(message, { code: 'http', status, serverCode })

const SECTION_LABELS: Record<Section, string> = {
  PURPOSE: '업무 목적',
  COMPLETION_CRITERIA: '완료 기준',
  ONGOING_TASKS: '진행 중인 업무',
  RECURRING_TASKS: '반복 업무',
  RULES_AND_EXCEPTIONS: '업무 기준과 예외',
  STAKEHOLDERS: '주요 관계자',
  TOOLS: '사용 도구와 자료',
  SCHEDULE: '업무 일정',
  ACCESS_ACCOUNTS: '접근 권한과 계정',
  FIRST_WEEK_CHECKLIST: '첫 주 체크리스트',
  CONFIRMED_CRITERIA: '확정한 기준',
}

const isEmptySection = (value: unknown) => (typeof value === 'string' ? !value.trim() : Array.isArray(value) && value.length === 0)

// 보완안이 섹션에 덧붙일 한 줄을 서버 content 형식으로 만든다.
const OBJECT_TEXT_KEYS: Partial<Record<Section, string>> = {
  ONGOING_TASKS: 'title',
  RECURRING_TASKS: 'title',
  STAKEHOLDERS: 'helpWith',
  TOOLS: 'name',
  SCHEDULE: 'task',
  ACCESS_ACCOUNTS: 'tool',
  CONFIRMED_CRITERIA: 'value',
}

function appendToContent(section: Section, current: unknown, addition: string): unknown {
  if (typeof current === 'string') return [current, addition].filter(Boolean).join(' ')
  const key = OBJECT_TEXT_KEYS[section]
  return [...(Array.isArray(current) ? current : []), key ? { [key]: addition } : addition]
}

export class MockHandoverRepository implements HandoverRepository {
  private readonly members = clone(memberFixtures)
  private readonly handovers = new Map<HandoverId, Handover>([
    [primaryHandoverFixture.id, clone(primaryHandoverFixture)],
  ])
  private readonly received = clone(receivedHandoverFixtures)
  private readonly reviews = clone(reviewSummaryFixtures)
  private readonly sent = clone(sentSummaryFixtures)
  /** 검수 대기 파일을 흉내 내려면 테스트에서 직접 넣는다. 없으면 검수할 것이 없는 파일로 본다. */
  readonly maskingReviews = new Map<string, MaskingReview>()
  private readonly revisions = new Map<HandoverId, number>()
  private readonly readinessResults = new Map<HandoverId, HandoverReadiness>()
  private readonly readinessFixes = new Map<string, { handoverId: HandoverId; fix: ReadinessFix }>()
  /** 보완을 적용해 충분해진 영역 */
  private readonly resolvedAreas = new Map<HandoverId, Set<ReadinessArea>>()
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
    this.maskingReviews.delete(fileId)
    this.syncSummaries(handover)
  }

  async getMaskingReview(id: HandoverId, fileId: string): Promise<MaskingReview> {
    const handover = await this.getMutable(id)
    const stored = this.maskingReviews.get(fileId)
    if (stored) return clone(stored)
    const file = handover.attachments.find((item) => item.id === fileId)
    if (!file) throw new RepositoryError('NOT_FOUND', '파일을 찾을 수 없어요.')
    return { fileId, fileName: file.name, status: file.status, confirmed: false, text: null, summary: summarizeMasking([]), candidates: [] }
  }

  async decideMaskingCandidate(id: HandoverId, fileId: string, candidateId: string, applied: boolean): Promise<MaskingCandidate> {
    await this.getMutable(id)
    const review = this.getReviewable(fileId)
    const candidate = review.candidates.find((item) => item.id === candidateId)
    if (!candidate) throw new RepositoryError('NOT_FOUND', '마스킹 항목을 찾을 수 없어요.')
    candidate.applied = applied
    candidate.pendingReview = false
    review.summary = summarizeMasking(review.candidates)
    return clone(candidate)
  }

  async addMaskingCandidate(id: HandoverId, fileId: string, range: MaskingRangeInput): Promise<MaskingCandidate> {
    await this.getMutable(id)
    const review = this.getReviewable(fileId)
    const candidate: MaskingCandidate = {
      id: `manual-${review.candidates.length + 1}`,
      type: range.type ?? 'CUSTOM',
      typeLabel: '직접 마스킹',
      origin: 'manual',
      start: range.start,
      end: range.end,
      confidence: 100,
      applied: true,
      needsReview: false,
      pendingReview: false,
      preview: '***',
    }
    review.candidates = [...review.candidates, candidate].sort((left, right) => left.start - right.start)
    review.summary = summarizeMasking(review.candidates)
    return clone(candidate)
  }

  async removeMaskingCandidate(id: HandoverId, fileId: string, candidateId: string): Promise<void> {
    await this.getMutable(id)
    const review = this.getReviewable(fileId)
    review.candidates = review.candidates.filter((item) => item.id !== candidateId)
    review.summary = summarizeMasking(review.candidates)
  }

  async confirmMasking(id: HandoverId, fileId: string): Promise<MaskingReview> {
    const handover = await this.getMutable(id)
    const review = this.getReviewable(fileId)
    if (review.summary.remaining > 0) throw new RepositoryError('VALIDATION', `확인하지 않은 항목이 ${review.summary.remaining}개 남아 있어요.`)
    Object.assign(review, { confirmed: true, status: 'ready', text: null })
    handover.attachments = handover.attachments.map((file) => file.id === fileId ? { ...file, status: 'ready', pendingReviewCount: 0 } : file)
    return clone(review)
  }

  private getReviewable(fileId: string) {
    const review = this.maskingReviews.get(fileId)
    if (!review || review.status !== 'review') throw new RepositoryError('VALIDATION', '검수 대기 상태가 아닌 파일이에요.')
    return review
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

  async getDocument(id: HandoverId): Promise<HandoverDraft> {
    const handover = await this.getMutable(id)
    return { document: clone(handover.document), revision: this.revisionOf(id) }
  }

  async saveDocument(id: HandoverId, document: HandoverDocument, baseRevision?: number): Promise<number> {
    const handover = await this.getMutable(id)
    this.assertRevision(id, baseRevision)
    handover.document = clone(document)
    this.syncSummaries(handover)
    return this.bumpRevision(id)
  }

  async getReadiness(id: HandoverId): Promise<HandoverReadiness | null> {
    await this.getMutable(id)
    const stored = this.readinessResults.get(id)
    return stored ? { ...clone(stored), stale: stored.draftRevision !== this.revisionOf(id) } : null
  }

  async evaluateReadiness(id: HandoverId): Promise<HandoverReadiness> {
    const handover = await this.getMutable(id)
    const stored = this.readinessResults.get(id)
    // 서버처럼 내용이 그대로면 같은 결과를 돌려준다.
    if (stored && stored.draftRevision === this.revisionOf(id)) return clone(stored)
    const readiness = this.scoreReadiness(id, handover)
    this.readinessResults.set(id, readiness)
    return clone(readiness)
  }

  async getReadinessRubric(id: HandoverId): Promise<ReadinessRubric> {
    await this.getMutable(id)
    return clone(readinessRubricFixture)
  }

  async createReadinessFix(id: HandoverId, area: ReadinessArea): Promise<ReadinessFix> {
    const handover = await this.getMutable(id)
    const readiness = this.readinessResults.get(id)
    if (!readiness) throw serverError(404, 'READINESS_NOT_EVALUATED', '아직 준비도를 평가하지 않았어요.')
    if (readiness.draftRevision !== this.revisionOf(id)) throw serverError(409, 'READINESS_STALE', '평가 이후 문서가 바뀌었어요. 다시 평가해 주세요.')
    const item = readiness.areas.find((entry) => entry.area === area)
    if (!item || item.status === 'sufficient') throw serverError(409, 'READINESS_ITEM_SUFFICIENT', '이미 충분한 항목이에요.')

    const before = readSectionValue(handover.document, item.section)
    const needsInput = isEmptySection(before.value)
    const fix: ReadinessFix = {
      id: `fix-${this.readinessFixes.size + 1}`,
      area,
      areaLabel: item.label,
      section: item.section,
      sectionLabel: item.sectionLabel,
      status: needsInput ? 'needs-input' : 'proposed',
      baseRevision: this.revisionOf(id),
      stale: false,
      appliedRevision: null,
      before,
      after: needsInput ? null : this.proposeSection(handover.document, item.section, item.resolution),
      changeSummary: needsInput ? '' : `${item.sectionLabel}에 빠진 내용을 보탰어요.`,
      questions: needsInput ? [{ id: 'q-1', question: `${item.label}에 대해 알려 주세요.`, reason: item.summary, answer: null }] : [],
      evidence: clone(item.evidence),
    }
    this.readinessFixes.set(fix.id, { handoverId: id, fix })
    return clone(fix)
  }

  async getReadinessFix(id: HandoverId, fixId: string): Promise<ReadinessFix> {
    const { fix } = this.getFix(id, fixId)
    return clone({ ...fix, stale: this.isOpen(fix) && fix.baseRevision !== this.revisionOf(id) })
  }

  async answerReadinessFix(id: HandoverId, fixId: string, answers: ReadinessFixAnswer[]): Promise<ReadinessFix> {
    const handover = await this.getMutable(id)
    const { fix } = this.getOpenFix(id, fixId)
    if (fix.baseRevision !== this.revisionOf(id)) throw serverError(409, 'AI_DRAFT_REVISION_CONFLICT', '그사이 문서가 바뀌었어요.')
    for (const { questionId, answer } of answers) {
      const question = fix.questions.find((item) => item.id === questionId)
      if (!question) throw serverError(400, 'BAD_REQUEST', '없는 질문이에요.')
      question.answer = answer
    }
    const addition = fix.questions.map((item) => item.answer?.trim()).filter(Boolean).join(' ')
    if (addition) {
      fix.status = 'proposed'
      fix.after = this.proposeSection(handover.document, fix.section, addition)
      fix.changeSummary = `답변을 ${fix.sectionLabel}에 반영했어요.`
    }
    return clone(fix)
  }

  async applyReadinessFix(id: HandoverId, fixId: string, baseRevision: number): Promise<ReadinessFixApplied> {
    const handover = await this.getMutable(id)
    const { fix } = this.getOpenFix(id, fixId)
    if (fix.status !== 'proposed' || !fix.after) throw serverError(409, 'READINESS_FIX_INVALID_STATE', '적용할 수정안이 없어요.')
    this.assertRevision(id, baseRevision)
    handover.document = applySectionValue(handover.document, fix.after)
    this.syncSummaries(handover)
    const revision = this.bumpRevision(id)
    fix.status = 'applied'
    fix.appliedRevision = revision
    const resolved = this.resolvedAreas.get(id) ?? new Set<ReadinessArea>()
    this.resolvedAreas.set(id, resolved.add(fix.area))
    return {
      fix: clone(fix),
      draft: { document: clone(handover.document), revision },
      readiness: await this.evaluateReadiness(id),
    }
  }

  async discardReadinessFix(id: HandoverId, fixId: string): Promise<ReadinessFix> {
    const { fix } = this.getOpenFix(id, fixId)
    fix.status = 'discarded'
    return clone(fix)
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

  private revisionOf(id: HandoverId) {
    return this.revisions.get(id) ?? 1
  }

  private bumpRevision(id: HandoverId) {
    const next = this.revisionOf(id) + 1
    this.revisions.set(id, next)
    return next
  }

  private assertRevision(id: HandoverId, baseRevision: number | undefined) {
    if (baseRevision !== undefined && baseRevision !== this.revisionOf(id)) {
      throw serverError(409, 'AI_DRAFT_REVISION_CONFLICT', '그사이 문서가 바뀌었어요. 최신 문서를 다시 불러와 주세요.')
    }
  }

  private isOpen(fix: ReadinessFix) {
    return fix.status === 'needs-input' || fix.status === 'proposed'
  }

  private getFix(id: HandoverId, fixId: string) {
    const entry = this.readinessFixes.get(fixId)
    if (!entry || entry.handoverId !== id) throw serverError(404, 'READINESS_FIX_NOT_FOUND', '보완안을 찾을 수 없어요.')
    return entry
  }

  private getOpenFix(id: HandoverId, fixId: string) {
    const entry = this.getFix(id, fixId)
    if (!this.isOpen(entry.fix)) throw serverError(409, 'READINESS_FIX_INVALID_STATE', '이미 적용하거나 닫은 보완안이에요.')
    return entry
  }

  private proposeSection(document: HandoverDocument, section: Section, addition: string) {
    return toDocumentSectionValue(section, appendToContent(section, toSectionContent(document, section), addition))
  }

  // 서버 규칙을 따른다: 배점 × 상태 비율, 잃은 점수가 큰 순, 부족한 영역 앞의 3개가 중요한 확인.
  private scoreReadiness(id: HandoverId, handover: Handover): HandoverReadiness {
    const { areas: rubricAreas, statusPercent, readyScore, minimumScore, keyIssueCount } = readinessRubricFixture
    const resolved = this.resolvedAreas.get(id)
    const evidence = handover.attachments.slice(0, 1).map((file) => ({ fileId: file.id, fileName: file.name, locator: '1쪽' }))
    const evaluated = rubricAreas.map((rubric) => {
      const section = rubric.sections[0]!
      const weak = resolved?.has(rubric.area) ? undefined : weakReadinessAreas[rubric.area]
      const empty = isEmptySection(readSectionValue(handover.document, section).value)
      const status = empty ? 'missing' : weak?.status ?? 'sufficient'
      const result: ReadinessAreaResult = {
        area: rubric.area,
        label: rubric.label,
        criteria: rubric.criteria,
        weight: rubric.weight,
        status,
        statusLabel: READINESS_STATUS_LABELS[status],
        percent: statusPercent[status],
        keyIssue: false,
        section,
        sectionLabel: SECTION_LABELS[section],
        anchorText: empty ? null : weak?.anchorText ?? null,
        summary: empty ? `${SECTION_LABELS[section]} 내용이 없어요.` : weak?.summary ?? '',
        resolution: empty ? `${SECTION_LABELS[section]}을(를) 채워 주세요.` : weak?.resolution ?? '',
        evidence: status === 'sufficient' ? [] : clone(evidence),
      }
      return { result, lost: rubric.weight * (100 - result.percent) / 100 }
    }).sort((left, right) => right.lost - left.lost)

    const keyIssues = evaluated.filter((entry) => entry.lost > 0).slice(0, keyIssueCount)
    keyIssues.forEach((entry) => { entry.result.keyIssue = true })
    const score = Math.round(evaluated.reduce((sum, entry) => sum + entry.result.weight - entry.lost, 0))
    const grade = score >= readyScore ? 'ready' : score >= minimumScore ? 'needs-improvement' : 'not-ready'
    return {
      evaluationId: `evaluation-${id}-${this.revisionOf(id)}`,
      rubricVersion: readinessRubricFixture.version,
      score,
      potentialScore: Math.min(100, Math.round(score + keyIssues.reduce((sum, entry) => sum + entry.lost, 0))),
      grade,
      gradeLabel: grade === 'ready' ? '인수인계 가능' : grade === 'needs-improvement' ? '보완 필요' : '준비 부족',
      keyIssueCount: keyIssues.length,
      stale: false,
      draftRevision: this.revisionOf(id),
      evaluatedAt: '2026-09-17T00:00:00Z',
      areas: evaluated.map((entry) => entry.result),
    }
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
