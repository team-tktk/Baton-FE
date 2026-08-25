import { useRef } from 'react'

import type { HandoverAttachment } from '@/entities/handover'
import { Badge } from '@/shared/ui/badge'
import { Icon } from '@/shared/ui/icon'
import { validateHandoverFile } from '@/shared/lib/file'

import styles from './MockFileUploader.module.css'

interface MockFileUploaderProps {
  attachments: HandoverAttachment[]
  onAdd: (attachment: HandoverAttachment) => void
  onReject: (message: string) => void
  onRemove: (id: string) => void
}

const formatSize = (size: number) => size >= 1_000_000 ? `${(size / 1_000_000).toFixed(1)}MB` : `${Math.round(size / 1_000)}KB`

export function MockFileUploader({ attachments, onAdd, onReject, onRemove }: MockFileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <button className={styles.drop} type="button" onClick={() => inputRef.current?.click()}>
        <span><Icon name="upload" /></span><strong>파일을 여기에 끌어다 놓으세요</strong><small>PDF, DOCX, XLSX, PPTX · 파일당 최대 50MB</small><em>파일 선택</em>
      </button>
      <input ref={inputRef} hidden multiple accept=".pdf,.docx,.xlsx,.pptx" type="file" onChange={(event) => {
        for (const file of Array.from(event.target.files ?? [])) {
          const result = validateHandoverFile(file)
          if (!result.ok) { onReject(result.message); continue }
          onAdd({ id: `attachment-local-${crypto.randomUUID()}`, name: file.name, mimeType: file.type, size: file.size })
        }
        event.target.value = ''
      }} />
      <section className={styles.files}>
        <header><div><h2>업로드한 파일</h2><p>AI가 아래 {attachments.length}개 파일을 함께 읽어요.</p></div><Badge tone="blue">{attachments.length}개</Badge></header>
        {attachments.map((file) => <article key={file.id}><Icon name="file" /><p><strong>{file.name}</strong><small>{formatSize(file.size)}</small></p><Badge tone="green">업로드 완료</Badge><button aria-label={`${file.name} 삭제`} type="button" onClick={() => onRemove(file.id)}>×</button></article>)}
      </section>
    </>
  )
}
