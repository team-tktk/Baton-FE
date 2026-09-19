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
  ReadinessFix,
  ReadinessFixAnswer,
  ReadinessFixApplied,
  ReadinessRubric,
  ReviewComment,
  ReviewSummary,
  SentSummary,
  UpdateHandoverInput,
} from '../model/types'

export interface HandoverRepository {
  listMembers(): Promise<HandoverParticipant[]>
  listReceivedHandovers(): Promise<HandoverSummary[]>
  listSentHandovers(): Promise<SentSummary[]>
  getHandover(id: HandoverId): Promise<Handover>
  createDraft(input: CreateHandoverInput): Promise<Handover>
  listFiles(id: HandoverId): Promise<HandoverAttachment[]>
  uploadFile(id: HandoverId, file: File): Promise<HandoverAttachment>
  deleteFile(id: HandoverId, fileId: string): Promise<void>
  downloadFile(id: HandoverId, fileId: string): Promise<HandoverFileDownload>
  getMaskingReview(id: HandoverId, fileId: string): Promise<MaskingReview>
  decideMaskingCandidate(id: HandoverId, fileId: string, candidateId: string, applied: boolean): Promise<MaskingCandidate>
  addMaskingCandidate(id: HandoverId, fileId: string, range: MaskingRangeInput): Promise<MaskingCandidate>
  removeMaskingCandidate(id: HandoverId, fileId: string, candidateId: string): Promise<void>
  /** 되돌릴 수 없다. 서버가 원문을 지우고 가린 텍스트만 남긴다. */
  confirmMasking(id: HandoverId, fileId: string): Promise<MaskingReview>
  startAnalysis(id: HandoverId): Promise<AnalysisJob>
  getAnalysis(id: HandoverId): Promise<AnalysisJob>
  retryAnalysis(id: HandoverId): Promise<AnalysisJob>
  listQuestions(id: HandoverId): Promise<InterviewQuestion[]>
  answerQuestion(id: HandoverId, questionId: string, answer: string): Promise<void>
  skipQuestion(id: HandoverId, questionId: string): Promise<void>
  completeQuestions(id: HandoverId): Promise<void>
  getDocument(id: HandoverId): Promise<HandoverDraft>
  /**
   * 내용 전체를 교체하고 새 revision을 돌려준다.
   * baseRevision을 주면 그사이 바뀐 문서는 덮어쓰지 않고 409(AI_DRAFT_REVISION_CONFLICT)로 실패한다.
   */
  saveDocument(id: HandoverId, document: HandoverDocument, baseRevision?: number): Promise<number>
  /** 아직 평가하지 않았으면 null. AI를 부르지 않는다. */
  getReadiness(id: HandoverId): Promise<HandoverReadiness | null>
  /** 동기 AI 호출이라 수십 초 걸린다. 내용이 같으면 이전 결과를 그대로 준다. */
  evaluateReadiness(id: HandoverId): Promise<HandoverReadiness>
  getReadinessRubric(id: HandoverId): Promise<ReadinessRubric>
  /** 부족한 영역들의 보완을 시작하고 물을 질문을 모은다. AI를 부르지 않고 문서도 바뀌지 않는다. */
  startReadinessFix(id: HandoverId, areas: ReadinessArea[]): Promise<ReadinessFix>
  getReadinessFix(id: HandoverId, fixId: string): Promise<ReadinessFix>
  /** 질문 답만 저장한다(AI 호출 없음). 여러 번 나눠 보내도 된다. */
  answerReadinessFix(id: HandoverId, fixId: string, answers: ReadinessFixAnswer[]): Promise<ReadinessFix>
  /** 모든 영역의 수정안을 한 번에 만든다(동기 AI 1회). 아직 부족한 영역에는 새 질문이 붙는다. */
  generateReadinessFix(id: HandoverId, fixId: string): Promise<ReadinessFix>
  /** 수정안이 있는 영역의 섹션만 바꾸고 최신 문서와 재평가 결과를 함께 돌려준다. */
  applyReadinessFix(id: HandoverId, fixId: string, baseRevision: number): Promise<ReadinessFixApplied>
  discardReadinessFix(id: HandoverId, fixId: string): Promise<ReadinessFix>
  acknowledgeHandover(id: HandoverId): Promise<void>
  completeHandover(id: HandoverId): Promise<Handover>
  updateDraft(id: HandoverId, changes: UpdateHandoverInput): Promise<Handover>
  submitHandover(id: HandoverId): Promise<Handover>
  listChatMessages(id: HandoverId): Promise<HandoverChatExchange[]>
  listSuggestedQuestions(id: HandoverId): Promise<string[]>
  askQuestion(id: HandoverId, question: string): Promise<HandoverAnswer>
  listReviews(): Promise<ReviewSummary[]>
  listComments(id: HandoverId): Promise<ReviewComment[]>
  addReviewComment(id: HandoverId, comment: string): Promise<ReviewComment>
  saveReviewChecklist(id: HandoverId, items: Array<{ label: string; checked: boolean }>): Promise<void>
  approveHandover(id: HandoverId): Promise<Handover>
}
