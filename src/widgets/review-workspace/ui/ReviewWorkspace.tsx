import type { Handover, HandoverAttachment } from '@/entities/handover'
import { ReviewActions } from '@/features/review-handover'
import { HandoverReadDocument } from '@/widgets/handover-document'

import styles from './ReviewWorkspace.module.css'

interface ReviewWorkspaceProps {
  handover: Handover
  pending: boolean
  onApprove: () => void | Promise<void>
  onComment: (comment: string) => void | Promise<void>
  onRevision: () => void | Promise<void>
  onAttachmentOpen: (attachment: HandoverAttachment) => void
}

export function ReviewWorkspace(props: ReviewWorkspaceProps) {
  return <div className={styles.workspace}>
    <div className={styles.document}><HandoverReadDocument handover={props.handover} onAttachmentOpen={props.onAttachmentOpen} /></div>
    <ReviewActions handover={props.handover} pending={props.pending} onApprove={props.onApprove} onComment={props.onComment} onRevision={props.onRevision} />
  </div>
}
