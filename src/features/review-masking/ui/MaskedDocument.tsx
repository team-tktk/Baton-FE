import { useMemo } from 'react'

import type { MaskingCandidate } from '@/entities/handover'

import { buildMaskedSegments } from '../model/buildMaskedSegments'
import { markElementId } from '../model/elementIds'
import styles from './MaskedDocument.module.css'

interface MaskedDocumentProps {
  candidates: MaskingCandidate[]
  fileName: string
  selectedId: string | null
  text: string
  onSelect: (candidateId: string) => void
}

/**
 * 서버가 추출한 원문 위에 마스킹 후보를 표시한다. 원본 PDF가 아니라 추출 텍스트다.
 * 가릴 항목은 확정 뒤 보일 가림 값으로, 가리지 않을 항목은 원문 그대로 보여 준다.
 */
export function MaskedDocument({ candidates, fileName, onSelect, selectedId, text }: MaskedDocumentProps) {
  const segments = useMemo(() => buildMaskedSegments(text.length, candidates), [candidates, text.length])

  return (
    <div aria-label={`${fileName} 추출 텍스트`} className={styles.document} role="region">
      {segments.map((segment) => {
        if (segment.kind === 'text') {
          return <span data-start={segment.start} key={`text-${segment.start}`}>{text.slice(segment.start, segment.end)}</span>
        }
        const { candidate } = segment
        const tone = candidate.pendingReview ? styles.pending : candidate.applied ? styles.applied : styles.kept
        return (
          <button
            aria-label={`${candidate.typeLabel} ${candidate.applied ? candidate.preview : text.slice(segment.start, segment.end)}, ${candidate.pendingReview ? '확인 필요' : candidate.applied ? '가림' : '가리지 않음'}`}
            aria-pressed={selectedId === candidate.id}
            className={`${styles.mark} ${tone} ${selectedId === candidate.id ? styles.selected : ''}`.trim()}
            data-start={segment.start}
            id={markElementId(candidate.id)}
            key={candidate.id}
            type="button"
            onClick={() => onSelect(candidate.id)}
          >
            <span aria-hidden="true">{candidate.applied ? candidate.preview : text.slice(segment.start, segment.end)}</span>
            <small aria-hidden="true">{candidate.typeLabel}</small>
          </button>
        )
      })}
    </div>
  )
}
