import type { DocumentSection, ReadinessFix } from '@/entities/handover'
import { Icon } from '@/shared/ui/icon'

import type { FixPreviewItem } from '../model/fixPreview'
import type { FixPhase } from '../model/useReadinessFix'
import styles from './ReadinessFixReviewPanel.module.css'

interface ReadinessFixReviewPanelProps {
  fix: ReadinessFix
  items: FixPreviewItem[]
  selectedIds: ReadonlySet<string>
  phase: FixPhase
  error: string | null
  onApply: () => void
  onCancel: () => void
  onLocate: (section: DocumentSection) => void
  onRestoreAll: () => void
}

export function ReadinessFixReviewPanel({ error, fix, items, onApply, onCancel, onLocate, onRestoreAll, phase, selectedIds }: ReadinessFixReviewPanelProps) {
  const applying = phase === 'applying'
  const selectedCount = items.filter((item) => selectedIds.has(item.id)).length
  const excludedCount = items.length - selectedCount
  const sections = [...new Map(items.map((item) => [item.section, item])).values()]

  return <section aria-label="보완 내용 확인" className={styles.panel}>
    <header>
      <span className={styles.step}>2단계 / 2단계</span>
      <h2>문서에 추가할 내용을 확인해 주세요</h2>
      <p>녹색으로 표시된 변경분을 확인하고 필요 없는 항목은 문서에서 제외해 주세요.</p>
    </header>

    <section className={styles.sections}>
      <h3>변경 위치</h3>
      <ul>{sections.map((item) => {
        const count = items.filter((candidate) => candidate.section === item.section && selectedIds.has(candidate.id)).length
        return <li key={item.section}><button type="button" onClick={() => onLocate(item.section)}>
          <span>{item.sectionLabel}</span><small>{count}개</small><Icon name="chevron" />
        </button></li>
      })}</ul>
    </section>

    {excludedCount > 0 && <button className={styles.restore} type="button" onClick={onRestoreAll}>제외한 {excludedCount}개 다시 포함</button>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.actions}>
      <button disabled={applying} type="button" onClick={onCancel}>취소</button>
      <button disabled={applying || selectedCount === 0 || fix.stale} type="button" onClick={onApply}>
        {applying ? '적용하는 중…' : `${selectedCount}개 적용하기`}
      </button>
    </div>
  </section>
}
