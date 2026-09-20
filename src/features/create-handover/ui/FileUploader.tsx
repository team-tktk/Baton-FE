import { type DragEvent, useRef, useState } from 'react'

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
  onSampleSelect?: () => void
}

const STATUS_LABEL: Record<AttachmentStatus, string> = {
  processing: '처리 중',
  review: '민감정보 확인 필요',
  ready: '업로드 완료',
  failed: '처리 실패',
}
const STATUS_TONE: Record<AttachmentStatus, 'yellow' | 'blue' | 'green' | 'neutral'> = {
  processing: 'yellow',
  review: 'blue',
  ready: 'green',
  failed: 'neutral',
}

const formatSize = (size: number) => size >= 1_000_000 ? `${(size / 1_000_000).toFixed(1)}MB` : `${Math.round(size / 1_000)}KB`
const formatMeta = (attachment: HandoverAttachment) => `${attachment.name.split('.').pop()?.toUpperCase() ?? 'FILE'} · ${formatSize(attachment.size)}`

export function FileUploader({ attachments, onReject, onRemove, onSelect, onSampleSelect, uploading = false }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const accept = (files: FileList | null) => {
    const accepted: File[] = []
    for (const file of Array.from(files ?? [])) {
      const result = validateHandoverFile(file)
      if (!result.ok) { onReject(result.message); continue }
      accepted.push(file)
    }
    if (accepted.length > 0) onSelect(accepted)
  }

  const stopDragging = (event: DragEvent<HTMLElement>) => {
    // 자식 위로 이동할 때도 dragleave가 뜨므로, 영역을 완전히 벗어났을 때만 해제한다.
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setDragging(false)
  }

  return (
    <>
      <button
        className={`${styles.drop} ${dragging ? styles.dragging : ''} ${uploading ? styles.uploading : ''}`.trim()}
        disabled={uploading}
        type="button"
        onClick={() => onSampleSelect ? onSampleSelect() : inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); if (!uploading) setDragging(true) }}
        onDragLeave={stopDragging}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (!uploading) { if (onSampleSelect) onSampleSelect(); else accept(event.dataTransfer.files) }
        }}
      >
        <span className={styles.dropIcon}><Icon name="upload" /></span>
        <span className={styles.dropCopy}>
          <strong>{uploading ? '파일을 업로드하고 있어요' : onSampleSelect ? '준비된 샘플 파일 3개 추가' : dragging ? '여기에 놓으면 추가돼요' : '파일을 여기에 끌어다 놓으세요'}</strong>
          <small>{uploading ? '완료되면 아래 목록에서 상태가 자동으로 바뀌어요.' : onSampleSelect ? '할인전 메모 · 주문 현황 · 예외 대응 가이드' : 'PDF, DOCX, XLSX, PPTX · 파일당 최대 50MB'}</small>
        </span>
        <em>{uploading ? '올리는 중…' : onSampleSelect ? '샘플 추가' : '파일 선택'}</em>
      </button>
      <input ref={inputRef} hidden multiple data-testid="handover-file-input" accept=".pdf,.docx,.xlsx,.pptx" type="file" onChange={(event) => {
        accept(event.target.files)
        event.target.value = ''
      }} />
      {attachments.length > 0 && <section className={styles.files} aria-live="polite">
        <header><div><h2>추가된 파일</h2><p>{attachments.length > 0 ? `AI가 ${attachments.length}개 파일을 함께 읽어요.` : '아직 추가된 파일이 없어요.'}</p></div><Badge tone="blue">{attachments.length}개</Badge></header>
        <div className={styles.list}>
          {attachments.map((file) => (
            <article key={file.id}>
              <Icon name="file" />
              <p><strong>{file.name}</strong><small>{formatMeta(file)}</small></p>
              <Badge tone={file.id.startsWith('uploading-') ? 'blue' : STATUS_TONE[file.status]}>{file.id.startsWith('uploading-') ? '업로드 중' : STATUS_LABEL[file.status]}</Badge>
              <button aria-label={`${file.name} 삭제`} disabled={file.id.startsWith('uploading-')} type="button" onClick={() => onRemove(file.id)}>×</button>
            </article>
          ))}
        </div>
      </section>}
    </>
  )
}
