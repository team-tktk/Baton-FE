import type { AnalysisJob, AttachmentStatus, HandoverAttachment, HandoverParticipant, HandoverStatus, InterviewQuestion, QuestionStatus } from '../../model/types'
import type { AnalysisJobResponse, ClarificationQuestionResponse, FileMetadataResponse, FileStatusDto, HandoverStatusDto, MemberResponse, ParticipantDto } from '../dto/types'

const STATUS_BY_DTO: Record<HandoverStatusDto, HandoverStatus> = {
  DRAFT: 'draft',
  ANALYZING: 'draft',
  ANSWERING: 'draft',
  EDITING: 'draft',
  PENDING_REVIEW: 'submitted',
  REVISION_REQUESTED: 'revision-requested',
  APPROVED: 'approved',
  COMPLETED: 'completed',
}

export function toHandoverParticipant(member: MemberResponse): HandoverParticipant {
  return {
    id: member.id,
    name: member.name,
    position: member.position,
    team: member.team,
  }
}

export function toParticipantFromDto(participant: ParticipantDto): HandoverParticipant {
  return {
    id: participant.userId,
    name: participant.name,
    position: participant.position,
    team: participant.team,
  }
}

export function toHandoverStatus(status: HandoverStatusDto): HandoverStatus {
  return STATUS_BY_DTO[status] ?? 'draft'
}

const ATTACHMENT_STATUS_BY_DTO: Record<FileStatusDto, AttachmentStatus> = {
  EXTRACTING: 'processing',
  INDEXED: 'ready',
  FAILED: 'failed',
}

export function toAttachmentStatus(status: FileStatusDto): AttachmentStatus {
  return ATTACHMENT_STATUS_BY_DTO[status] ?? 'processing'
}

export function toHandoverAttachment(file: FileMetadataResponse): HandoverAttachment {
  return {
    id: file.id,
    name: file.fileName,
    mimeType: file.mimeType,
    size: file.size,
    status: toAttachmentStatus(file.status),
  }
}

export function toAnalysisJob(job: AnalysisJobResponse): AnalysisJob {
  return {
    status: job.status === 'COMPLETED' ? 'completed' : job.status === 'FAILED' ? 'failed' : 'running',
    progress: Math.min(100, Math.max(0, job.progress ?? 0)),
    currentStep: job.currentStep?.trim() || '업무 자료를 살펴보는 중',
    error: job.error ?? null,
  }
}

const QUESTION_STATUS_BY_DTO: Record<ClarificationQuestionResponse['status'], QuestionStatus> = {
  PENDING: 'pending',
  ANSWERED: 'answered',
  SKIPPED: 'skipped',
}

export function toInterviewQuestion(question: ClarificationQuestionResponse): InterviewQuestion {
  // reason과 evidence 모두 "왜 묻는지"를 설명한다. 화면에는 한 줄로 합쳐 보여 준다.
  const help = [question.reason, question.evidence].map((part) => part?.trim()).filter(Boolean).join(' · ')
  return {
    id: question.id,
    question: question.questionText,
    help: help || '자료에서 확인하지 못한 내용이라 직접 여쭤봐요.',
    options: (question.options ?? []).map((option) => ({ label: option.label, description: option.description ?? '' })),
    status: QUESTION_STATUS_BY_DTO[question.status] ?? 'pending',
    answer: question.answer ?? null,
  }
}
