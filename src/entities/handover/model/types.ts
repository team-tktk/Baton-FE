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

export interface HandoverAttachment {
  id: string
  name: string
  mimeType: string
  size: number
  status: AttachmentStatus
}

export interface InterviewOption {
  label: string
  description: string
}

export interface InterviewQuestion {
  id: string
  question: string
  help: string
  options: InterviewOption[]
}

export interface HandoverTask {
  id: string
  title: string
  statusLabel: string
  tone: 'blue' | 'yellow' | 'green' | 'violet'
  description: string
  nextAction: string
  meta: string
  criterionId?: string
}

export interface HandoverCriterion {
  id: string
  title: string
  defaultText: string
  question?: string
  options: string[]
  confirmedValue?: string
}

export interface HandoverPerson {
  id: string
  name: string
  team: string
  responsibility: string
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
  recipient: HandoverParticipant
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

export interface HandoverAnswer {
  text: string
  source: string | null
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
