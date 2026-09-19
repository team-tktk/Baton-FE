import { describe, expect, it } from 'vitest'

import type { MaskingCandidate } from '@/entities/handover'

import { buildMaskedSegments } from './buildMaskedSegments'

const candidate = (id: string, start: number, end: number): MaskingCandidate => ({
  id,
  type: 'EMAIL',
  typeLabel: '이메일',
  origin: 'detected',
  start,
  end,
  confidence: 90,
  applied: true,
  needsReview: false,
  pendingReview: false,
  preview: '***',
})

const ranges = (segments: ReturnType<typeof buildMaskedSegments>) => segments.map((segment) => [segment.kind, segment.start, segment.end])

describe('buildMaskedSegments', () => {
  it('covers the whole text without gaps, in position order', () => {
    const segments = buildMaskedSegments(20, [candidate('b', 12, 15), candidate('a', 3, 6)])

    expect(ranges(segments)).toEqual([
      ['text', 0, 3],
      ['mark', 3, 6],
      ['text', 6, 12],
      ['mark', 12, 15],
      ['text', 15, 20],
    ])
  })

  it('handles marks at both ends', () => {
    expect(ranges(buildMaskedSegments(10, [candidate('a', 0, 4), candidate('b', 6, 10)]))).toEqual([
      ['mark', 0, 4],
      ['text', 4, 6],
      ['mark', 6, 10],
    ])
  })

  it('skips overlapping or out-of-range candidates instead of duplicating text', () => {
    const segments = buildMaskedSegments(10, [
      candidate('a', 2, 6),
      candidate('overlap', 5, 8),
      candidate('outside', 8, 14),
      candidate('empty', 7, 7),
    ])

    expect(ranges(segments)).toEqual([
      ['text', 0, 2],
      ['mark', 2, 6],
      ['text', 6, 10],
    ])
  })

  it('returns a single text segment when there is nothing to mask', () => {
    expect(ranges(buildMaskedSegments(5, []))).toEqual([['text', 0, 5]])
    expect(buildMaskedSegments(0, [])).toEqual([])
  })
})
