import { describe, expect, it } from 'vitest'

import type { MaskingCandidateResponse } from '../dto/types'
import { toAttachmentStatus, toHandoverAttachment } from './handoverMapper'
import { summarizeMasking, toManualCandidateRequest, toMaskingCandidate, toMaskingReview } from './maskingMapper'

const candidate = (overrides: Partial<MaskingCandidateResponse> = {}): MaskingCandidateResponse => ({
  id: 'candidate-1',
  type: 'EMAIL',
  typeLabel: '이메일',
  origin: 'DETECTED',
  startOffset: 10,
  endOffset: 27,
  confidencePercent: 98,
  applied: true,
  needsReview: false,
  pendingReview: false,
  preview: 'min***@example.com',
  ...overrides,
})

describe('maskingMapper', () => {
  it('keeps a review-waiting file out of the processing state', () => {
    // 처리 중으로 두면 업로드 화면 폴링이 사용자 확정 전까지 끝나지 않는다.
    expect(toAttachmentStatus('MASKING_REVIEW')).toBe('review')
    expect(toAttachmentStatus('INDEXING')).toBe('processing')
  })

  it('reads the remaining review count and treats a missing count as zero', () => {
    const base = { id: 'file-1', fileName: '업무협약서.docx', mimeType: 'application/msword', size: 10, createdAt: '2026-09-16T00:00:00Z' }

    expect(toHandoverAttachment({ ...base, status: 'MASKING_REVIEW', remainingReviewCount: 2 })).toMatchObject({ status: 'review', pendingReviewCount: 2 })
    expect(toHandoverAttachment({ ...base, status: 'INDEXED' }).pendingReviewCount).toBe(0)
  })

  it('maps candidate offsets and origin onto the screen model', () => {
    expect(toMaskingCandidate(candidate({ origin: 'MANUAL', type: 'CUSTOM', confidencePercent: 100 }))).toEqual({
      id: 'candidate-1',
      type: 'CUSTOM',
      typeLabel: '이메일',
      origin: 'manual',
      start: 10,
      end: 27,
      confidence: 100,
      applied: true,
      needsReview: false,
      pendingReview: false,
      preview: 'min***@example.com',
    })
  })

  it('fills a confirmed review without text or candidates', () => {
    expect(toMaskingReview({
      fileId: 'file-1',
      fileName: '업무협약서.docx',
      status: 'INDEXED',
      confirmed: true,
      summary: { total: 0, autoMasked: 0, needsReview: 0, remaining: 0, applied: 0 },
    })).toEqual({
      fileId: 'file-1',
      fileName: '업무협약서.docx',
      status: 'ready',
      confirmed: true,
      text: null,
      summary: { total: 0, autoMasked: 0, needsReview: 0, remaining: 0, applied: 0 },
      candidates: [],
    })
  })

  it('derives the summary with the same rules as the server', () => {
    const candidates = [
      candidate({ id: 'auto' }),
      candidate({ id: 'pending', needsReview: true, pendingReview: true, applied: false }),
      candidate({ id: 'reviewed', needsReview: true, pendingReview: false, applied: true }),
      candidate({ id: 'manual', origin: 'MANUAL' }),
    ].map(toMaskingCandidate)

    expect(summarizeMasking(candidates)).toEqual({ total: 4, autoMasked: 1, needsReview: 2, remaining: 1, applied: 3 })
  })

  it('omits the type of a manual range unless it was chosen', () => {
    expect(toManualCandidateRequest({ start: 3, end: 9 })).toEqual({ startOffset: 3, endOffset: 9 })
    expect(toManualCandidateRequest({ start: 3, end: 9, type: 'PHONE' })).toEqual({ startOffset: 3, endOffset: 9, type: 'PHONE' })
  })
})
