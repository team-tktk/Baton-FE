import type { AttachmentStatus, HandoverAttachment, HandoverParticipant, HandoverStatus } from '../../model/types'
import type { FileMetadataResponse, FileStatusDto, HandoverStatusDto, MemberResponse, ParticipantDto } from '../dto/types'

const STATUS_BY_DTO: Record<HandoverStatusDto, HandoverStatus> = {
  DRAFT: 'draft',
  ANALYZING: 'draft',
  ANSWERING: 'draft',
  EDITING: 'draft',
  PENDING_REVIEW: 'submitted',
  REVISION_REQUESTED: 'revision-requested',
  APPROVED: 'approved',
  COMPLETED: 'approved',
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
