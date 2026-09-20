import type { AnalysisJob, AttachmentStatus, HandoverAttachment, HandoverParticipant, HandoverStatus, InterviewQuestion, QuestionStatus } from '../../model/types'
import type { AnalysisJobResponse, ClarificationQuestionResponse, FileMetadataResponse, FileStatusDto, HandoverStatusDto, MemberResponse, ParticipantDto, SourceEvidenceDto } from '../dto/types'

const STATUS_BY_DTO: Record<HandoverStatusDto, HandoverStatus> = {
  DRAFT: 'draft',
  ANALYZING: 'draft',
  ANSWERING: 'draft',
  EDITING: 'draft',
  PENDING_REVIEW: 'submitted',
  REVISION_REQUESTED: 'submitted',
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

// 검수 대기(MASKING_REVIEW)를 처리 중으로 두면 업로드 화면 폴링이 끝나지 않는다. 별도 상태로 둔다.
// INDEXING은 확정 뒤 임베딩하는 짧은 구간이라 처리 중과 같다.
const ATTACHMENT_STATUS_BY_DTO: Record<FileStatusDto, AttachmentStatus> = {
  EXTRACTING: 'processing',
  MASKING_REVIEW: 'review',
  INDEXING: 'processing',
  INDEXED: 'ready',
  FAILED: 'failed',
}

export function toAttachmentStatus(status: FileStatusDto): AttachmentStatus {
  return ATTACHMENT_STATUS_BY_DTO[status] ?? 'processing'
}

/** 웹 링크·Slack 메시지를 파일과 같은 모양으로 바꾼다. 검수 화면이 파일과 함께 다룰 수 있게 하기 위해서다. */
export function toExternalAttachment(source: SourceEvidenceDto): HandoverAttachment {
  const slack = source.type === 'SLACK_MESSAGE'
  return {
    id: source.sourceId,
    name: source.title?.trim() || (slack ? 'Slack 메시지' : '웹 링크'),
    mimeType: '',
    size: 0,
    status: toAttachmentStatus(source.status),
    origin: slack ? 'slack' : 'web-link',
    detail: (slack ? source.conversationName : source.accessPath)?.trim() || '',
  }
}

export function toHandoverAttachment(file: FileMetadataResponse): HandoverAttachment {
  return {
    id: file.id,
    name: file.fileName,
    mimeType: file.mimeType,
    size: file.size,
    status: toAttachmentStatus(file.status),
    pendingReviewCount: file.remainingReviewCount ?? 0,
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
  // 화면의 "건너뛰기"는 나중에 다시 답할 수 있는 DEFERRED와 같다.
  UNKNOWN: 'skipped',
  NOT_APPLICABLE: 'skipped',
  DEFERRED: 'skipped',
}

export function toInterviewQuestion(question: ClarificationQuestionResponse): InterviewQuestion {
  const reason = question.reason?.trim()
  const evidence = question.evidence?.trim()
  return {
    id: question.id,
    question: question.questionText,
    help: reason || '자료에서 확인하지 못한 내용이라 직접 여쭤봐요.',
    evidence: evidence || undefined,
    options: (question.options ?? []).map((option) => ({ label: option.label, description: option.description ?? '' })),
    status: QUESTION_STATUS_BY_DTO[question.status] ?? 'pending',
    answer: question.answer ?? null,
  }
}
