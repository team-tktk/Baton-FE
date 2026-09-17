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
