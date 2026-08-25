import type { Handover } from '@/entities/handover'
import { ConfirmationPanel } from '@/features/edit-handover'
import { ExportHandoverActions } from '@/features/export-handover'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { HandoverDocument } from '@/widgets/handover-document'

import styles from './DocumentStep.module.css'

interface DocumentStepProps {
  handover: Handover
  confirmations: Record<string, string>
  pending: boolean
  returningFromComplete: boolean
  onBack: () => void
  onConfirm: (criterionId: string, value: string) => void
  onFeedback: (message: string) => void
  onFieldChange: (field: string, value: string) => void
  onSubmit: () => void
}

export function DocumentStep(props: DocumentStepProps) {
  return <main className={styles.main}>
    <header className={styles.heading}><div><span><Icon name="spark" /> AI 초안이 준비됐어요</span><h1>{props.returningFromComplete ? '인수인계 문서를 수정해 주세요' : '전달할 내용을 마지막으로 확인해 주세요'}</h1><p>파란 점선 영역은 직접 고칠 수 있고, 오른쪽에서 판단 기준 세 가지를 확인할 수 있어요.</p></div><ExportHandoverActions handover={props.handover} onFeedback={props.onFeedback} /></header>
    <div className={styles.layout}>
      <HandoverDocument handover={props.handover} mode="edit" onFieldChange={props.onFieldChange} />
      <ConfirmationPanel confirmations={props.confirmations} criteria={props.handover.document.criteria} pending={props.pending} submitLabel={props.returningFromComplete ? '변경사항 저장하기' : undefined} onConfirm={props.onConfirm} onSubmit={props.onSubmit} />
    </div>
    <footer><Button variant="ghost" onClick={props.onBack}><Icon name="back" /> 이전으로</Button></footer>
  </main>
}
