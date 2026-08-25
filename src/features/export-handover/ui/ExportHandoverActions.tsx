import type { Handover } from '@/entities/handover'
import { buildHandoverMarkdown, copyMarkdown, downloadMarkdown, handoverMarkdownFilename } from '@/shared/lib/markdown'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'

import styles from './ExportHandoverActions.module.css'

interface ExportHandoverActionsProps {
  handover: Handover
  onFeedback: (message: string) => void
  compact?: boolean
}

export function ExportHandoverActions({ handover, onFeedback, compact = false }: ExportHandoverActionsProps) {
  const markdown = buildHandoverMarkdown(handover)
  return <div className={styles.actions}>
    <Button aria-label={compact ? 'Markdown 복사' : undefined} variant="secondary" onClick={async () => { await copyMarkdown(markdown); onFeedback('Markdown을 클립보드에 복사했어요') }}><Icon name="copy" />{compact ? null : ' Markdown 복사'}</Button>
    <Button aria-label={compact ? '파일 다운로드' : undefined} variant="secondary" onClick={() => { downloadMarkdown(markdown, handoverMarkdownFilename(handover)); onFeedback('Markdown 파일을 내려받았어요') }}><Icon name="download" />{compact ? null : ' 파일 다운로드'}</Button>
  </div>
}
