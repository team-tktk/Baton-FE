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
  MaskingCandidate,
  MaskingRangeInput,
  MaskingReview,
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
  getDocument(id: HandoverId): Promise<HandoverDocument>
  saveDocument(id: HandoverId, document: HandoverDocument): Promise<void>
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
