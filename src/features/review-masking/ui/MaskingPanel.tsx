import { useState } from 'react'

import type { MaskingCandidate, MaskingSummary } from '@/entities/handover'
import { Icon } from '@/shared/ui/icon'

import { rowElementId } from '../model/elementIds'
import styles from './MaskingPanel.module.css'

type Filter = 'all' | 'pending' | 'applied'

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '확인 필요' },
  { value: 'applied', label: '가릴 항목' },
]

interface MaskingPanelProps {
  candidates: MaskingCandidate[]
  confirmed: boolean
  disabled?: boolean
  savingIds: string[]
  selectedId: string | null
  summary: MaskingSummary
  onRemove?: (candidateId: string) => void
  onSelect: (candidateId: string) => void
  onToggle: (candidateId: string, applied: boolean) => void
}

function matches(candidate: MaskingCandidate, filter: Filter) {
  if (filter === 'pending') return candidate.needsReview
  if (filter === 'applied') return candidate.applied
  return true
}

export function MaskingPanel({ candidates, confirmed, disabled = false, onRemove, onSelect, onToggle, savingIds, selectedId, summary }: MaskingPanelProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const visible = candidates.filter((candidate) => matches(candidate, filter))

  return (
    <section aria-labelledby="masking-panel-title" className={styles.panel}>
      <header>
        <span className={styles.shield}><Icon name="shield" /></span>
        <div>
          <h2 id="masking-panel-title">민감정보를 확인해 주세요</h2>
          <p>체크한 항목은 확정할 때 가려지고, AI에는 가려진 내용만 전달돼요. 빠진 정보는 문서에서 드래그해 직접 가릴 수 있어요.</p>
        </div>
      </header>

      <div className={styles.summary}>
        <div className={styles.auto}>
          <Icon name="check" />
          <p><strong>자동 마스킹 {summary.autoMasked}건</strong><span>자동으로 찾아 가린 항목</span></p>
        </div>
        <div className={summary.remaining > 0 ? styles.attention : styles.settled}>
          <Icon name="alert" />
          <p>
            <strong>확인 필요 {summary.needsReview}건</strong>
            <span>{summary.remaining > 0 ? `아직 ${summary.remaining}건을 확인하지 않았어요` : '모두 확인했어요'}</span>
          </p>
        </div>
      </div>

      <div className={styles.listHead}>
        <h3>감지된 민감정보 <span>{summary.total}</span></h3>
        <div aria-label="목록 필터" className={styles.filters} role="group">
          {FILTERS.map((item) => (
            <button aria-pressed={filter === item.value} key={item.value} type="button" onClick={() => setFilter(item.value)}>{item.label}</button>
          ))}
        </div>
      </div>

      {candidates.length === 0 ? (
        <p className={styles.empty}>자동으로 찾은 민감정보가 없어요. 가릴 내용이 있으면 문서에서 드래그해 주세요.</p>
      ) : visible.length === 0 ? (
        <p className={styles.empty}>조건에 맞는 항목이 없어요.</p>
      ) : (
        <ul className={styles.list}>
          {visible.map((candidate) => (
            <li className={`${selectedId === candidate.id ? styles.selected : ''} ${candidate.pendingReview ? styles.rowPending : ''}`.trim()} id={rowElementId(candidate.id)} key={candidate.id}>
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
              <span className={styles.badges}>
                {candidate.origin === 'manual'
                  ? <em className={styles.manual}>직접 추가</em>
                  : candidate.pendingReview
                    ? <em className={styles.needs}>확인 필요</em>
                    : candidate.needsReview
                      ? <em className={styles.reviewed}>확인함</em>
                      : <em className={styles.autoBadge}>자동</em>}
                {candidate.origin === 'manual' && onRemove
                  ? (
                    <button
                      aria-label={`직접 추가한 ${candidate.preview} 삭제`}
                      className={styles.remove}
                      disabled={disabled || confirmed || savingIds.includes(candidate.id)}
                      type="button"
                      onClick={() => onRemove(candidate.id)}
                    >
                      삭제
                    </button>
                  )
                  : <small>신뢰도 {candidate.confidence}%</small>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
