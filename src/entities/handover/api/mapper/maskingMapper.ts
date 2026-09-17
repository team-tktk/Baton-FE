import type { MaskingCandidate, MaskingRangeInput, MaskingReview, MaskingSummary } from '../../model/types'
import type { ManualCandidateRequest, MaskingCandidateResponse, MaskingReviewResponse } from '../dto/types'
import { toAttachmentStatus } from './handoverMapper'

export function toMaskingCandidate(candidate: MaskingCandidateResponse): MaskingCandidate {
  return {
    id: candidate.id,
    type: candidate.type,
    typeLabel: candidate.typeLabel,
    origin: candidate.origin === 'MANUAL' ? 'manual' : 'detected',
    start: candidate.startOffset,
    end: candidate.endOffset,
    confidence: candidate.confidencePercent,
    applied: candidate.applied,
    needsReview: candidate.needsReview,
    pendingReview: candidate.pendingReview,
    preview: candidate.preview,
  }
}

/**
 * 서버 요약과 같은 규칙으로 후보 목록에서 요약을 다시 계산한다.
 * 적용/해제 응답은 항목 하나만 돌려주므로, 요약을 받으려고 매번 전체를 다시 조회하지 않기 위해서다.
 */
export function summarizeMasking(candidates: MaskingCandidate[]): MaskingSummary {
  return {
    total: candidates.length,
    autoMasked: candidates.filter((item) => item.origin === 'detected' && !item.needsReview).length,
    needsReview: candidates.filter((item) => item.needsReview).length,
    remaining: candidates.filter((item) => item.pendingReview).length,
    applied: candidates.filter((item) => item.applied).length,
  }
}

export function toMaskingReview(review: MaskingReviewResponse): MaskingReview {
  return {
    fileId: review.fileId,
    fileName: review.fileName,
    status: toAttachmentStatus(review.status),
    confirmed: review.confirmed,
    text: review.text ?? null,
    summary: { ...review.summary },
    candidates: (review.candidates ?? []).map(toMaskingCandidate),
  }
}

export function toManualCandidateRequest(range: MaskingRangeInput): ManualCandidateRequest {
  return {
    startOffset: range.start,
    endOffset: range.end,
    ...(range.type ? { type: range.type } : {}),
  }
}
