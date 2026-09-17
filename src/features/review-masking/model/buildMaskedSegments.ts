import type { MaskingCandidate } from '@/entities/handover'

export type MaskedSegment =
  | { kind: 'text'; start: number; end: number }
  | { kind: 'mark'; start: number; end: number; candidate: MaskingCandidate }

/**
 * 원문을 일반 구간과 마스킹 후보 구간으로 나눈다.
 * 서버가 겹치는 구간을 막지만, 어긋난 데이터가 와도 원문이 중복되거나 빠지지 않도록
 * 범위를 벗어나거나 앞 구간과 겹치는 후보는 표시하지 않는다.
 * 각 구간의 start는 나중에 드래그 선택을 원문 위치로 되돌릴 때 기준이 된다.
 */
export function buildMaskedSegments(textLength: number, candidates: MaskingCandidate[]): MaskedSegment[] {
  const segments: MaskedSegment[] = []
  let cursor = 0
  const ordered = [...candidates].sort((left, right) => left.start - right.start)
  for (const candidate of ordered) {
    const valid = candidate.start >= cursor && candidate.start < candidate.end && candidate.end <= textLength
    if (!valid) continue
    if (candidate.start > cursor) segments.push({ kind: 'text', start: cursor, end: candidate.start })
    segments.push({ kind: 'mark', start: candidate.start, end: candidate.end, candidate })
    cursor = candidate.end
  }
  if (cursor < textLength) segments.push({ kind: 'text', start: cursor, end: textLength })
  return segments
}
