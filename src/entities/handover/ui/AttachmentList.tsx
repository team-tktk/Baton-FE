import type { HandoverAttachment } from '../model/types'
import { Icon } from '@/shared/ui/icon'

import styles from './EntitySummary.module.css'

export function AttachmentList({ attachments, onOpen }: { attachments: HandoverAttachment[]; onOpen?: (attachment: HandoverAttachment) => void }) {
  return <ul className={styles.list}>{attachments.map((attachment) => <li key={attachment.id}><button type="button" onClick={() => onOpen?.(attachment)}><Icon name="file" /><span><strong>{attachment.name}</strong><small>{Math.max(1, Math.round(attachment.size / 1024))} KB</small></span><Icon name="download" /></button></li>)}</ul>
}
