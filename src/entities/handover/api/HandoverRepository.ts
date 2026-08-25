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

export interface HandoverRepository {
  listMembers(): Promise<HandoverParticipant[]>
  listReceivedHandovers(): Promise<HandoverSummary[]>
  getHandover(id: HandoverId): Promise<Handover>
  createDraft(input: CreateHandoverInput): Promise<Handover>
  listFiles(id: HandoverId): Promise<HandoverAttachment[]>
  uploadFile(id: HandoverId, file: File): Promise<HandoverAttachment>
  deleteFile(id: HandoverId, fileId: string): Promise<void>
  updateDraft(id: HandoverId, changes: UpdateHandoverInput): Promise<Handover>
  submitHandover(id: HandoverId): Promise<Handover>
  askQuestion(id: HandoverId, question: string): Promise<HandoverAnswer>
  listReviews(): Promise<ReviewSummary[]>
  addReviewComment(id: HandoverId, comment: string): Promise<ReviewComment>
  requestRevision(id: HandoverId): Promise<Handover>
  approveHandover(id: HandoverId): Promise<Handover>
}
