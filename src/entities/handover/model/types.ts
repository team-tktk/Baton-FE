export type HandoverId = string

export type HandoverStatus =
  | 'draft'
  | 'submitted'
  | 'in-progress'
  | 'revision-requested'
  | 'approved'

export interface HandoverParticipant {
  id: string
  name: string
  position: string
  team: string
}

export type AttachmentStatus = 'processing' | 'ready' | 'failed'

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

export interface HandoverAnswerCitation {
  sourceId: string
  title: string
  locator: string
}

export interface HandoverAnswer {
  text: string
  /** 자료에서 근거를 찾았는지. false면 지어내지 않고 문의 안내를 준다. */
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
