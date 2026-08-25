import type { Handover } from '@/entities/handover'
import { HandoverDraftEditor } from '@/widgets/handover-document'

import styles from './DocumentStep.module.css'

interface DocumentStepProps {
  handover: Handover
  confirmations: Record<string, string>
  pending: boolean
  returningFromComplete: boolean
  onConfirm: (criterionId: string, value: string) => void
  onFeedback: (message: string) => void
  onFieldChange: (field: string, value: string) => void
  onSubmit: () => void
}

export function DocumentStep(props: DocumentStepProps) {
  return <main className={styles.main}><HandoverDraftEditor {...props} /></main>
}
