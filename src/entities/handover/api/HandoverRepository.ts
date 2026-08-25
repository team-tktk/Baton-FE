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
  UpdateHandoverInput,
} from '../model/types'

export interface HandoverRepository {
  listMembers(): Promise<HandoverParticipant[]>
  listReceivedHandovers(): Promise<HandoverSummary[]>
  getHandover(id: HandoverId): Promise<Handover>
  createDraft(input: CreateHandoverInput): Promise<Handover>
  listFiles(id: HandoverId): Promise<HandoverAttachment[]>
  uploadFile(id: HandoverId, file: File): Promise<HandoverAttachment>
  deleteFile(id: HandoverId, fileId: string): Promise<void>
  downloadFile(id: HandoverId, fileId: string): Promise<HandoverFileDownload>
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
  askQuestion(id: HandoverId, question: string): Promise<HandoverAnswer>
  listReviews(): Promise<ReviewSummary[]>
  addReviewComment(id: HandoverId, comment: string): Promise<ReviewComment>
  saveReviewChecklist(id: HandoverId, items: Array<{ label: string; checked: boolean }>): Promise<void>
  requestRevision(id: HandoverId): Promise<Handover>
  approveHandover(id: HandoverId): Promise<Handover>
}
