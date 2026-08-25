import type { Handover } from '@/entities/handover'
import { ExportHandoverActions } from '@/features/export-handover'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'

import styles from './CompletionStep.module.css'

interface CompletionStepProps {
  handover: Handover
  onEdit: () => void
  onFeedback: (message: string) => void
  onHome: () => void
}

export function CompletionStep({ handover, onEdit, onFeedback, onHome }: CompletionStepProps) {
  return <main className={styles.main}>
    <div className={styles.icon}><Icon name="check" /></div>
    <span className={styles.kicker}>인수인계 전달 완료</span>
    <h1>{handover.recipient.name}님에게<br />업무를 전달했어요</h1>
    <p>{handover.deliveredAtLabel} · {handover.document.scope}</p>
    <section><strong>{handover.title}</strong><span>문서는 언제든 다시 열어 수정할 수 있어요.</span><ExportHandoverActions handover={handover} onFeedback={onFeedback} /></section>
    <div className={styles.actions}><Button variant="secondary" onClick={onEdit}>문서 수정하기</Button><Button onClick={onHome}>홈으로 돌아가기 <Icon name="arrow" /></Button></div>
  </main>
}
