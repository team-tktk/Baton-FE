export type HandoverId = string

export type HandoverStatus =
  | 'draft'
  | 'submitted'
  | 'in-progress'
  | 'approved'
  | 'completed'

export interface HandoverParticipant {
  id: string
  name: string
  position: string
  team: string
}

/** review는 추출이 끝나 민감정보 검수를 기다리는 상태다. 사용자가 확정하기 전까지 바뀌지 않는다. */
export type AttachmentStatus = 'processing' | 'review' | 'ready' | 'failed'

export type AnalysisStatus = 'running' | 'completed' | 'failed'

export interface AnalysisJob {
  status: AnalysisStatus
  progress: number
  currentStep: string
  error: string | null
}

export interface HandoverAttachment {
  id: string
  name: string
  mimeType: string
  size: number
  status: AttachmentStatus
  /** 검수에서 아직 확인하지 않은 항목 수. 없으면 0으로 본다. */
  pendingReviewCount?: number
}

export type MaskingType = 'EMAIL' | 'PHONE' | 'ACCOUNT' | 'RRN' | 'CARD' | 'BUSINESS_NO' | 'CUSTOM'

export interface MaskingCandidate {
  id: string
  type: MaskingType
  typeLabel: string
  origin: 'detected' | 'manual'
  /** 원문 text 기준 [start, end) */
  start: number
  end: number
  confidence: number
  /** 확정할 때 가릴지 여부(체크박스) */
  applied: boolean
  /** 사람이 확인해야 하는 항목인지 */
  needsReview: boolean
  /** 확인이 필요한데 아직 적용·해제를 누르지 않았는지 */
  pendingReview: boolean
  preview: string
}

export interface MaskingSummary {
  total: number
  /** 자동으로 찾았고 확인이 필요 없는 항목 */
  autoMasked: number
  needsReview: number
  /** 0이어야 확정할 수 있다 */
  remaining: number
  applied: number
}

export interface MaskingReview {
  fileId: string
  fileName: string
  status: AttachmentStatus
  confirmed: boolean
  /** 검수 대기일 때만 있다. 확정하면 원문이 서버에서 삭제된다. */
  text: string | null
  summary: MaskingSummary
  candidates: MaskingCandidate[]
}

export interface MaskingRangeInput {
  start: number
  end: number
  type?: MaskingType
}

// 원본 파일 다운로드 응답: 서버가 준 바이트와 파일명(Content-Disposition에서 읽거나 첨부 이름으로 대체).
export interface HandoverFileDownload {
  blob: Blob
  filename: string
}

export interface InterviewOption {
  label: string
  description: string
}

export type QuestionStatus = 'pending' | 'answered' | 'skipped'

export interface InterviewQuestion {
  id: string
  question: string
  help: string
  options: InterviewOption[]
  status: QuestionStatus
  answer: string | null
}

export interface HandoverTask {
  id: string
  title: string
  statusLabel: string
  tone: 'blue' | 'yellow' | 'green' | 'violet'
  description: string
  nextAction: string
  meta: string
}

export interface HandoverCriterion {
  id: string
  title: string
  defaultText: string
}

export interface HandoverPerson {
  id: string
  name: string
  team: string
  responsibility: string
}

export interface HandoverScheduleRow {
  cycle: string
  task: string
  detail: string
}

export interface HandoverAccessRow {
  tool: string
  permission: string
  status: string
}

export interface HandoverConfirmedCriterion {
  label: string
  value: string
}

export interface HandoverDocument {
  title: string
  intro: string
  scope: string
  purpose: string
  completionStandard: string
  statusLabel: string
  updatedAtLabel: string
  activeTasks: HandoverTask[]
  recurringTasks: HandoverTask[]
  criteria: HandoverCriterion[]
  people: HandoverPerson[]
  tools: string[]
  checklist: string[]
  schedule: HandoverScheduleRow[]
  accessAccounts: HandoverAccessRow[]
  confirmedCriteria: HandoverConfirmedCriterion[]
}

/** 서버 문서와 그 버전. 저장·보완 적용 때 revision을 baseRevision으로 돌려보내 덮어쓰기를 막는다. */
export interface HandoverDraft {
  document: HandoverDocument
  revision: number
}

/** 준비도 영역. 보완 요청 경로(/items/{area}/fixes)에 그대로 쓰므로 서버 값을 유지한다. */
export type ReadinessArea = 'SCOPE' | 'PROCEDURE' | 'COMPLETION' | 'EXCEPTION' | 'SCHEDULE' | 'CONTACTS' | 'ACCESS' | 'EVIDENCE'

/** 서버 문서 섹션 */
export type DocumentSection =
  | 'PURPOSE'
  | 'COMPLETION_CRITERIA'
  | 'ONGOING_TASKS'
  | 'RECURRING_TASKS'
  | 'RULES_AND_EXCEPTIONS'
  | 'STAKEHOLDERS'
  | 'TOOLS'
  | 'SCHEDULE'
  | 'ACCESS_ACCOUNTS'
  | 'FIRST_WEEK_CHECKLIST'
  | 'CONFIRMED_CRITERIA'

/** 섹션이 화면 문서 모델의 어느 필드에 해당하는지 */
export interface DocumentSectionFields {
  PURPOSE: 'purpose'
  COMPLETION_CRITERIA: 'completionStandard'
  ONGOING_TASKS: 'activeTasks'
  RECURRING_TASKS: 'recurringTasks'
  RULES_AND_EXCEPTIONS: 'criteria'
  STAKEHOLDERS: 'people'
  TOOLS: 'tools'
  SCHEDULE: 'schedule'
  ACCESS_ACCOUNTS: 'accessAccounts'
  FIRST_WEEK_CHECKLIST: 'checklist'
  CONFIRMED_CRITERIA: 'confirmedCriteria'
}

/** 섹션 하나의 내용. section에 따라 value의 모양이 정해진다. */
export type DocumentSectionValue = {
  [S in DocumentSection]: { section: S; value: HandoverDocument[DocumentSectionFields[S]] }
}[DocumentSection]

export type ReadinessGrade = 'ready' | 'needs-improvement' | 'not-ready'

/** 막대는 이 네 단계(100·50·25·0%)뿐이다. */
export type ReadinessItemStatus = 'sufficient' | 'partial' | 'conflict' | 'missing'

export interface ReadinessEvidence {
  /** 업로드 파일 id. downloadFile로 원본을 연다. */
  fileId: string
  fileName: string
  locator: string
}

export interface ReadinessAreaResult {
  area: ReadinessArea
  label: string
  criteria: string
  weight: number
  status: ReadinessItemStatus
  statusLabel: string
  percent: number
  /** "중요한 확인"에 올릴 항목(최대 3개) */
  keyIssue: boolean
  section: DocumentSection
  sectionLabel: string
  /** 문서에서 강조할 문장. 없으면 null */
  anchorText: string | null
  summary: string
  resolution: string
  evidence: ReadinessEvidence[]
}

export interface HandoverReadiness {
  evaluationId: string
  rubricVersion: string
  score: number
  /** 중요한 확인을 모두 해결했을 때의 예상 점수 */
  potentialScore: number
  grade: ReadinessGrade
  gradeLabel: string
  keyIssueCount: number
  /** 평가 이후 문서나 자료가 바뀌었다. 다시 평가해야 한다. */
  stale: boolean
  draftRevision: number
  evaluatedAt: string
  /** 잃은 점수가 큰 영역부터 */
  areas: ReadinessAreaResult[]
}

export interface ReadinessRubric {
  version: string
  areas: Array<{ area: ReadinessArea; label: string; criteria: string; weight: number; sections: DocumentSection[] }>
  statusPercent: Record<ReadinessItemStatus, number>
  readyScore: number
  minimumScore: number
  keyIssueCount: number
}

export type ReadinessFixStatus = 'needs-input' | 'proposed' | 'applied' | 'discarded'

export interface ReadinessFixQuestion {
  id: string
  question: string
  reason: string
  answer: string | null
}

export interface ReadinessFixAnswer {
  questionId: string
  answer: string
}

export interface ReadinessFix {
  id: string
  area: ReadinessArea
  areaLabel: string
  section: DocumentSection
  sectionLabel: string
  status: ReadinessFixStatus
  baseRevision: number
  /** 보완안을 만든 뒤 문서가 바뀌어 적용할 수 없다. 새로 만들어야 한다. */
  stale: boolean
  appliedRevision: number | null
  before: DocumentSectionValue
  /** 수정안이 아직 없으면(추가 질문 대기) null */
  after: DocumentSectionValue | null
  changeSummary: string
  questions: ReadinessFixQuestion[]
  evidence: ReadinessEvidence[]
}

export interface ReadinessFixApplied {
  fix: ReadinessFix
  draft: HandoverDraft
  /** 재평가만 실패하면 null. evaluateReadiness를 다시 부른다. */
  readiness: HandoverReadiness | null
}

export interface ReviewComment {
  id: string
  authorName: string
  text: string
  createdAtLabel: string
}

export interface HandoverReview {
  checklist: Array<{ id: string; label: string; checked: boolean }>
  comments: ReviewComment[]
}

export interface Handover {
  id: HandoverId
  title: string
  owner: HandoverParticipant
  /** 대표 인수자. 화면 문구에서 한 명만 필요할 때 쓴다. */
  recipient: HandoverParticipant
  recipients: HandoverParticipant[]
  team: string
  status: HandoverStatus
  deliveredAtLabel: string
  attachments: HandoverAttachment[]
  document: HandoverDocument
  interviewQuestions: InterviewQuestion[]
  review: HandoverReview
  firstSchedule: {
    dayLabel: string
    time: string
    title: string
    description: string
  }
}

export interface HandoverSummary {
  id: HandoverId
  person: string
  team: string
  scope: string
  date: string
  status: HandoverStatus
  statusLabel: string
  tone: 'blue' | 'yellow' | 'green'
  tasks: number
  files: number
}

export interface ReviewSummary {
  id: HandoverId
  title: string
  from: string
  team: string
  date: string
  status: HandoverStatus
  statusLabel: string
  tone: 'yellow' | 'green'
  tasks: number
  files: number
}

/** 인계자(owner) 본인이 만든 인수인계 목록 카드. GET /handovers/sent 응답 기반. */
export interface SentSummary {
  id: HandoverId
  title: string
  scope: string
  date: string
  status: HandoverStatus
  tasks: number
  files: number
  recipients: number
}

export interface HandoverAnswerCitation {
  sourceId: string
  title: string
  locator: string
}

export interface HandoverAnswer {
  text: string
  /** 업로드된 자료에서 근거를 찾았는지. false여도 AI가 일반 지식으로 답할 수 있고, 그때는 citations가 비어 있다. */
  grounded: boolean
  citations: HandoverAnswerCitation[]
}

export interface HandoverChatExchange {
  id: string
  question: string
  answer: HandoverAnswer
}

export interface CreateHandoverInput {
  recipientIds: string[]
  reviewerIds: string[]
  workItems: string[]
}

export interface UpdateHandoverInput {
  attachments?: HandoverAttachment[]
  document?: Partial<HandoverDocument>
  recipientIds?: string[]
  workItems?: string[]
}
