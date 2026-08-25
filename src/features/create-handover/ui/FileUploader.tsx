import { useRef } from 'react'

import type { AttachmentStatus, HandoverAttachment } from '@/entities/handover'
import { Badge } from '@/shared/ui/badge'
import { Icon } from '@/shared/ui/icon'
import { validateHandoverFile } from '@/shared/lib/file'

import styles from './FileUploader.module.css'

interface FileUploaderProps {
  attachments: HandoverAttachment[]
  uploading?: boolean
  onReject: (message: string) => void
  onRemove: (id: string) => void
  onSelect: (files: File[]) => void
}

const STATUS_LABEL: Record<AttachmentStatus, string> = {
  processing: '처리 중',
  ready: '업로드 완료',
  failed: '처리 실패',
}
const STATUS_TONE: Record<AttachmentStatus, 'yellow' | 'green' | 'neutral'> = {
  processing: 'yellow',
  ready: 'green',
  failed: 'neutral',
}

const formatSize = (size: number) => size >= 1_000_000 ? `${(size / 1_000_000).toFixed(1)}MB` : `${Math.round(size / 1_000)}KB`
const formatMeta = (attachment: HandoverAttachment) => `${attachment.name.split('.').pop()?.toUpperCase() ?? 'FILE'} · ${formatSize(attachment.size)}`

export function FileUploader({ attachments, onReject, onRemove, onSelect, uploading = false }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <button className={styles.drop} disabled={uploading} type="button" onClick={() => inputRef.current?.click()}>
        <span className={styles.dropIcon}><Icon name="upload" /></span>
        <span className={styles.dropCopy}><strong>파일을 여기에 끌어다 놓으세요</strong><small>PDF, DOCX, XLSX, PPTX · 파일당 최대 50MB</small></span>
        <em>{uploading ? '올리는 중…' : '파일 선택'}</em>
      </button>
      <input ref={inputRef} hidden multiple data-testid="handover-file-input" accept=".pdf,.docx,.xlsx,.pptx" type="file" onChange={(event) => {
        const accepted: File[] = []
        for (const file of Array.from(event.target.files ?? [])) {
          const result = validateHandoverFile(file)
          if (!result.ok) { onReject(result.message); continue }
          accepted.push(file)
        }
        event.target.value = ''
        if (accepted.length > 0) onSelect(accepted)
      }} />
      <section className={styles.files}>
        <header><div><h2>업로드한 파일</h2><p>AI가 아래 {attachments.length}개 파일을 함께 읽어요.</p></div><Badge tone="blue">{attachments.length}개</Badge></header>
        <div className={styles.list}>
          {attachments.map((file) => (
            <article key={file.id}>
              <Icon name="file" />
              <p><strong>{file.name}</strong><small>{formatMeta(file)}</small></p>
              <Badge tone={STATUS_TONE[file.status]}>{STATUS_LABEL[file.status]}</Badge>
              <button aria-label={`${file.name} 삭제`} type="button" onClick={() => onRemove(file.id)}>×</button>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
