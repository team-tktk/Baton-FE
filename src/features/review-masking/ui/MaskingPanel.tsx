import type { MaskingCandidate } from '@/entities/handover'

import { rowElementId } from '../model/elementIds'
import styles from './MaskingPanel.module.css'

interface MaskingPanelProps {
  candidates: MaskingCandidate[]
  confirmed: boolean
  disabled?: boolean
  savingIds: string[]
  selectedId: string | null
  onRemove?: (candidateId: string) => void
  onSelect: (candidateId: string) => void
  onToggle: (candidateId: string, applied: boolean) => void
}

export function MaskingPanel({ candidates, confirmed, disabled = false, onRemove, onSelect, onToggle, savingIds, selectedId }: MaskingPanelProps) {
  return (
    <section aria-labelledby="masking-panel-title" className={styles.panel}>
      <header>
        <h2 id="masking-panel-title">민감정보를 확인해 주세요</h2>
        <p>체크된 항목만 가려서 AI에 전달돼요.</p>
      </header>

      <div className={styles.listHead}>
        <h3>검수할 항목 <span>{candidates.length}</span></h3>
      </div>

      {candidates.length === 0 ? (
        <p className={styles.empty}>자동으로 찾은 민감정보가 없어요. 가릴 내용이 있으면 문서에서 드래그해 주세요.</p>
      ) : (
        <ul className={styles.list}>
          {candidates.map((candidate) => (
            <li className={`${candidate.origin === 'manual' ? styles.manual : styles.detected} ${selectedId === candidate.id ? styles.selected : ''} ${candidate.pendingReview ? styles.rowPending : ''}`.trim()} id={rowElementId(candidate.id)} key={candidate.id}>
              <input
                aria-label={`${candidate.typeLabel} ${candidate.preview} 가리기`}
                checked={candidate.applied}
                disabled={disabled || confirmed || savingIds.includes(candidate.id)}
                type="checkbox"
                onChange={(event) => onToggle(candidate.id, event.target.checked)}
              />
              <button className={styles.rowBody} type="button" onClick={() => onSelect(candidate.id)}>
                <strong>{candidate.typeLabel}</strong>
                <span className={styles.preview}>{candidate.preview}</span>
              </button>
              {candidate.origin === 'manual' && onRemove && (
                <button
                  aria-label={`직접 추가한 ${candidate.preview} 삭제`}
                  className={styles.remove}
                  disabled={disabled || confirmed || savingIds.includes(candidate.id)}
                  title="삭제"
                  type="button"
                  onClick={() => onRemove(candidate.id)}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
