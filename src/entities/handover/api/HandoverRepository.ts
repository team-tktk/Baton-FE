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

export interface HandoverRepository {
  listMembers(): Promise<HandoverParticipant[]>
  listReceivedHandovers(): Promise<HandoverSummary[]>
  getHandover(id: HandoverId): Promise<Handover>
  createDraft(input: CreateHandoverInput): Promise<Handover>
  listFiles(id: HandoverId): Promise<HandoverAttachment[]>
  uploadFile(id: HandoverId, file: File): Promise<HandoverAttachment>
  deleteFile(id: HandoverId, fileId: string): Promise<void>
  startAnalysis(id: HandoverId): Promise<AnalysisJob>
  getAnalysis(id: HandoverId): Promise<AnalysisJob>
  retryAnalysis(id: HandoverId): Promise<AnalysisJob>
  listQuestions(id: HandoverId): Promise<InterviewQuestion[]>
  answerQuestion(id: HandoverId, questionId: string, answer: string): Promise<void>
  skipQuestion(id: HandoverId, questionId: string): Promise<void>
  completeQuestions(id: HandoverId): Promise<void>
  getDocument(id: HandoverId): Promise<HandoverDocument>
  saveDocument(id: HandoverId, document: HandoverDocument): Promise<void>
  updateDraft(id: HandoverId, changes: UpdateHandoverInput): Promise<Handover>
  submitHandover(id: HandoverId): Promise<Handover>
  askQuestion(id: HandoverId, question: string): Promise<HandoverAnswer>
  listReviews(): Promise<ReviewSummary[]>
  addReviewComment(id: HandoverId, comment: string): Promise<ReviewComment>
  requestRevision(id: HandoverId): Promise<Handover>
  approveHandover(id: HandoverId): Promise<Handover>
}
