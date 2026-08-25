import type { Handover } from '@/entities/handover'
import { buildHandoverMarkdown, copyMarkdown, downloadMarkdown, handoverMarkdownFilename } from '@/shared/lib/markdown'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'

import styles from './ExportHandoverActions.module.css'

interface ExportHandoverActionsProps {
  handover: Handover
  onFeedback: (message: string) => void
}

export function ExportHandoverActions({ handover, onFeedback }: ExportHandoverActionsProps) {
  const markdown = buildHandoverMarkdown(handover)
  return <div className={styles.actions}>
    <Button variant="secondary" onClick={async () => { await copyMarkdown(markdown); onFeedback('Markdown을 클립보드에 복사했어요') }}><Icon name="copy" /> Markdown 복사</Button>
    <Button variant="secondary" onClick={() => { downloadMarkdown(markdown, handoverMarkdownFilename); onFeedback('Markdown 파일을 내려받았어요') }}><Icon name="download" /> 파일 다운로드</Button>
  </div>
}
