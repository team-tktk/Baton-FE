import type { HandoverParticipant, HandoverStatus } from '../../model/types'
import type { HandoverStatusDto, MemberResponse } from '../dto/types'

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

export function toHandoverStatus(status: HandoverStatusDto): HandoverStatus {
  return STATUS_BY_DTO[status] ?? 'draft'
}
