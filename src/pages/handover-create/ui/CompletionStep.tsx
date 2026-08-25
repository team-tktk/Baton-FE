import type { Handover } from '@/entities/handover'
import styles from './CompletionStep.module.css'

interface CompletionStepProps {
  handover: Handover
  onEdit: () => void
  onNext: () => void
  nextLabel?: string
}

export function CompletionStep({ handover, nextLabel = '홈으로', onEdit, onNext }: CompletionStepProps) {
  return <main className={styles.main}>
    <p className={styles.status}>✓ 전달 완료</p>
    <h1>{handover.recipient.name}님에게<br />인수인계서를 전달했어요</h1>
    <p className={styles.description}>수정한 내용은 받는 사람의 문서에도 바로 반영됩니다.</p>
    <div className={styles.actions}><button type="button" className={styles.edit} onClick={onEdit}>문서 수정하기</button><button type="button" className={styles.home} onClick={onNext}>{nextLabel}</button></div>
    <time>2026. 09. 11. 14:30 전달</time>
  </main>
}
