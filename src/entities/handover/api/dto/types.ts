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

export type AnalysisStatusDto =
  | 'QUEUED'
  | 'PARSING'
  | 'INDEXING'
  | 'GENERATING_QUESTIONS'
  | 'GENERATING_DRAFT'
  | 'COMPLETED'
  | 'FAILED'

export interface AnalysisJobResponse {
  jobId: string
  status: AnalysisStatusDto
  progress: number
  currentStep?: string
  error?: string | null
  updatedAt: string
}

export interface QuestionOptionDto {
  label: string
  description?: string
}

export interface ClarificationQuestionResponse {
  id: string
  type: 'INTERVIEW' | 'CONFLICT'
  questionText: string
  reason?: string
  evidence?: string
  options?: QuestionOptionDto[]
  status: 'PENDING' | 'ANSWERED' | 'SKIPPED'
  answer?: string | null
}

export interface QuestionAnswerRequest {
  answer?: string
  skipped: boolean
}

export interface TaskItemDto {
  title?: string
  status?: string
  description?: string
  nextAction?: string
  schedule?: string
}

export interface HandoverDraftContent {
  purpose?: string
  completionCriteria?: string
  ongoingTasks?: TaskItemDto[]
  recurringTasks?: TaskItemDto[]
  rulesAndExceptions?: string[]
  stakeholders?: Array<{ name?: string; team?: string; helpWith?: string }>
  tools?: Array<{ name?: string; description?: string }>
  schedule?: Array<{ cycle?: string; task?: string; detail?: string }>
  accessAccounts?: Array<{ tool?: string; permission?: string; status?: string }>
  firstWeekChecklist?: string[]
  confirmedCriteria?: Array<{ label?: string; value?: string }>
}

export interface HandoverDraftResponse {
  content: HandoverDraftContent
  updatedAt: string
}

export interface UpdateDraftRequest {
  content: HandoverDraftContent
}

export interface HandoverSummaryResponse {
  id: string
  title: string
  status: HandoverStatusDto
  owner: UserSummaryResponse
  workScopeSummary?: string
  workScopeCount?: number
  fileCount?: number
  recipientCount?: number
  receiptStatus?: string
  submittedAt?: string
  createdAt: string
  updatedAt: string
}

export interface HandoverListResponse {
  items: HandoverSummaryResponse[]
  nextCursor?: string
  hasNext: boolean
  statusCounts?: Record<string, number>
}

export interface ChecklistItemResponse {
  id: string
  label: string
  checked: boolean
}

export interface CommentResponse {
  id: string
  authorId: string
  authorName: string
  content: string
  createdAt: string
  updatedAt?: string
}

export interface ReviewDetailResponse {
  handoverId: string
  status: HandoverStatusDto
  document?: HandoverDraftResponse | null
  attachments?: FileMetadataResponse[]
  checklist?: ChecklistItemResponse[]
  comments?: CommentResponse[]
}

export interface CommentRequest {
  content: string
}

export interface ChecklistItemInput {
  label: string
  checked: boolean
}

export interface ReviewChecklistRequest {
  items: ChecklistItemInput[]
}
