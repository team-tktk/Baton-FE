export interface MemberResponse {
  id: string
  name: string
  team: string
  position: string
}

export interface MemberPageResponse {
  items: MemberResponse[]
  nextCursor?: string
  hasNext: boolean
}

export interface WorkScopeInput {
  title: string
  description?: string
}

export interface CreateHandoverRequest {
  title: string
  recipientIds: string[]
  reviewerIds: string[]
  workScopes: WorkScopeInput[]
}

export type HandoverStatusDto =
  | 'DRAFT'
  | 'ANALYZING'
  | 'ANSWERING'
  | 'EDITING'
  | 'PENDING_REVIEW'
  | 'REVISION_REQUESTED'
  | 'APPROVED'
  | 'COMPLETED'

export interface UserSummaryResponse {
  id: string
  name: string
  team: string
  position: string
}

export interface ParticipantDto {
  userId: string
  name: string
  team: string
  position: string
  role: 'RECIPIENT' | 'REVIEWER'
  receiptStatus?: string
}

export interface WorkScopeDto {
  id: string
  title: string
  description?: string
}

export interface HandoverResponse {
  id: string
  title: string
  status: HandoverStatusDto
  owner: UserSummaryResponse
  viewerRole?: string
  participants: ParticipantDto[]
  workScopes: WorkScopeDto[]
  submittedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export type FileStatusDto = 'EXTRACTING' | 'INDEXED' | 'FAILED'

export interface FileMetadataResponse {
  id: string
  fileName: string
  mimeType: string
  size: number
  status: FileStatusDto
  createdAt: string
}

export interface FileUploadResponse {
  sourceDocumentId: string
  fileName: string
  status: FileStatusDto
}
