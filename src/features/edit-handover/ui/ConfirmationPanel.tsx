import { useMemo, useState } from 'react'

import type { HandoverCriterion } from '@/entities/handover'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'

import styles from './ConfirmationPanel.module.css'

interface ConfirmationPanelProps {
  confirmations: Record<string, string>
  criteria: HandoverCriterion[]
  pending?: boolean
  submitLabel?: string
  onConfirm: (criterionId: string, value: string) => void
  onSubmit: () => void
}

export function ConfirmationPanel({ confirmations, criteria, pending = false, submitLabel = '인수인계 전달하기', onConfirm, onSubmit }: ConfirmationPanelProps) {
  const firstOpen = useMemo(() => criteria.findIndex((criterion) => !confirmations[criterion.id]), [confirmations, criteria])
  const [requestedIndex, setRequestedIndex] = useState<number | null>(null)
  const activeIndex = requestedIndex ?? (firstOpen < 0 ? criteria.length - 1 : firstOpen)
  const active = criteria[activeIndex]
  const [directAnswer, setDirectAnswer] = useState('')
  const confirmedCount = criteria.filter((criterion) => Boolean(confirmations[criterion.id])).length

  const confirm = (value: string) => {
    if (!active || !value.trim()) return
    onConfirm(active.id, value.trim())
    setDirectAnswer('')
    setRequestedIndex(Math.min(activeIndex + 1, criteria.length - 1))
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.title}><Icon name="shield" /><div><strong>전달 전 판단 기준 확인</strong><span>{confirmedCount}/{criteria.length} 확인됨</span></div></div>
      <div className={styles.tabs}>
        {criteria.map((criterion, index) => (
          <button className={index === activeIndex ? styles.activeTab : ''} key={criterion.id} type="button" onClick={() => setRequestedIndex(index)}>
            {confirmations[criterion.id] ? <Icon name="check" /> : index + 1} {criterion.title}
          </button>
        ))}
      </div>
      {active && <section className={styles.question}>
        <p>{active.defaultText}</p>
        <div className={styles.options}>{active.options.map((option) => <button key={option} type="button" onClick={() => confirm(option)}>{option}</button>)}</div>
        <label>직접 입력<textarea value={directAnswer} onChange={(event) => setDirectAnswer(event.target.value)} /></label>
        <button className={styles.direct} disabled={!directAnswer.trim()} type="button" onClick={() => confirm(directAnswer)}>직접 입력 반영</button>
      </section>}
      <Button disabled={confirmedCount !== criteria.length || pending} onClick={onSubmit}>{submitLabel}</Button>
    </aside>
  )
}
