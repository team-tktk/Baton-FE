import type { Handover } from '@/entities/handover'
import { ReviewActions } from '@/features/review-handover'
import { HandoverDocument } from '@/widgets/handover-document'

import styles from './ReviewWorkspace.module.css'

interface ReviewWorkspaceProps {
  handover: Handover
  pending: boolean
  onApprove: () => void | Promise<void>
  onComment: (comment: string) => void | Promise<void>
  onRevision: () => void | Promise<void>
}

export function ReviewWorkspace(props: ReviewWorkspaceProps) {
  return <div className={styles.workspace}><HandoverDocument handover={props.handover} mode="review" /><ReviewActions handover={props.handover} pending={props.pending} onApprove={props.onApprove} onComment={props.onComment} onRevision={props.onRevision} /></div>
}
