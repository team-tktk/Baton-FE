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

/**
 * 마스킹 검수가 켜진 서버에서는 추출 뒤 MASKING_REVIEW에서 멈추고 사용자 확정을 기다린다.
 * 확정하면 INDEXING(임베딩 중)을 거쳐 INDEXED가 된다.
 */
export type FileStatusDto = 'EXTRACTING' | 'MASKING_REVIEW' | 'INDEXING' | 'INDEXED' | 'FAILED'

export interface FileMetadataResponse {
  id: string
  fileName: string
  mimeType: string
  size: number
  status: FileStatusDto
  /** 마스킹 검수에서 아직 확인하지 않은 항목 수. 검수 대기 파일이 아니면 0이다. */
  remainingReviewCount?: number
  createdAt: string
}

export type MaskingTypeDto = 'EMAIL' | 'PHONE' | 'ACCOUNT' | 'RRN' | 'CARD' | 'BUSINESS_NO' | 'CUSTOM'

export interface MaskingCandidateResponse {
  id: string
  type: MaskingTypeDto
  typeLabel: string
  origin: 'DETECTED' | 'MANUAL'
  /** text 기준 [start, end) 구간. Java와 JS 모두 UTF-16 단위라 substring 위치가 그대로 맞는다. */
  startOffset: number
  endOffset: number
  confidencePercent: number
  applied: boolean
  needsReview: boolean
  pendingReview: boolean
  preview: string
}

export interface MaskingSummaryDto {
  total: number
  autoMasked: number
  needsReview: number
  remaining: number
  applied: number
}

export interface MaskingReviewResponse {
  fileId: string
  fileName: string
  status: FileStatusDto
  confirmed: boolean
  /** MASKING_REVIEW일 때만 내려온다. 확정하면 원문이 삭제되어 null이다. */
  text?: string | null
  summary: MaskingSummaryDto
  candidates?: MaskingCandidateResponse[]
}

export interface CandidateDecisionRequest {
  applied: boolean
}

export interface ManualCandidateRequest {
  startOffset: number
  endOffset: number
  type?: MaskingTypeDto
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

export interface Citation {
  sourceId: string
  title?: string
  locator?: string
  fileId?: string
}

export interface ChatQuestionRequest {
  question: string
}

/**
 * 답변 출처. `GENERAL_KNOWLEDGE`는 자료에 근거가 없어도 서버가 답을 만들어 준다
 * (용어 설명·되묻는 질문·인계자 문의 안내가 모두 여기 섞여 온다).
 * `NOT_FOUND`는 그 판단마저 실패했을 때만 오고 `answer`가 비어 있다.
 */
export type ChatAnswerSource = 'DOCUMENT' | 'GENERAL_KNOWLEDGE' | 'NOT_FOUND'

export interface ChatAnswerResponse {
  messageId: string
  answer?: string | null
  grounded: boolean
  answerSource?: ChatAnswerSource
  citations?: Citation[]
  fallbackContact?: string
}

export interface ChatMessageResponse {
  id: string
  question: string
  answer?: string | null
  grounded: boolean
  answerSource?: ChatAnswerSource
  citations?: Citation[]
  createdAt: string
}

export interface ChatMessagePageResponse {
  items: ChatMessageResponse[]
  nextCursor?: string
  hasNext: boolean
}
