import { useMemo, useState } from 'react'

import type { DocumentSection, Handover, ReadinessEvidence } from '@/entities/handover'
import { useHandoverRepository } from '@/entities/handover'
import type { SubmitCheck } from '@/features/check-readiness'
import { ReadinessPanel, ReadinessSubmitDialog, checkBeforeSubmit, sectionElementId, toDraftIssues, useDocumentReadiness } from '@/features/check-readiness'
import { ApiError } from '@/shared/api'
import { saveBlob } from '@/shared/lib/download'
import { HandoverDraftEditor } from '@/widgets/handover-document'

import styles from './DocumentStep.module.css'

interface DocumentStepProps {
  handover: Handover
  handoverId: string | null
  /** 서버 문서 버전. 바뀌면 편집기를 새로 그려 저장·재로딩한 내용을 확실히 반영한다. */
  revision: number | null
  /** 화면에서 고친 내용이 아직 서버에 없는지 */
  dirty: boolean
  pending: boolean
  returningFromComplete: boolean
  saveDraft: () => Promise<boolean>
  onFeedback: (message: string) => void
  onFieldChange: (field: string, value: string) => void
  onSubmit: () => void
}

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// 짚은 섹션으로 옮기고, 강조 문장이 있으면 그 칸에, 없으면 첫 편집 칸에 커서를 둔다.
function locateSection(section: DocumentSection) {
  const target = window.document.getElementById(sectionElementId(section))
  if (!target) return
  target.scrollIntoView?.({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  const field = target.querySelector<HTMLElement>('[role="textbox"][data-highlighted="true"]') ?? target.querySelector<HTMLElement>('[role="textbox"]')
  field?.focus({ preventScroll: true })
}

export function DocumentStep({ dirty, handover, handoverId, onSubmit, revision, saveDraft, ...editorProps }: DocumentStepProps) {
  const repository = useHandoverRepository()
  const readiness = useDocumentReadiness({ handoverId, saveDraft })
  const [check, setCheck] = useState<SubmitCheck | null>(null)
  const issues = useMemo(() => toDraftIssues(readiness.readiness), [readiness.readiness])

  const submit = () => {
    const next = checkBeforeSubmit(readiness.readiness, readiness.phase, dirty)
    if (next) setCheck(next)
    else onSubmit()
  }

  const openEvidence = (evidence: ReadinessEvidence) => {
    if (!handoverId) return
    void (async () => {
      try {
        const { blob, filename } = await repository.downloadFile(handoverId, evidence.fileId)
        saveBlob(blob, filename || evidence.fileName)
      } catch (caught) {
        editorProps.onFeedback(caught instanceof ApiError ? caught.message : '근거 파일을 내려받지 못했어요')
      }
    })()
  }

  return <main className={styles.main}>
    <div className={styles.layout}>
      <div className={styles.document}>
        <HandoverDraftEditor key={revision ?? 'draft'} {...editorProps} handover={handover} issues={issues} onSubmit={submit} />
      </div>
      <aside className={styles.aside}>
        <ReadinessPanel
          dirty={dirty}
          document={handover.document}
          error={readiness.error}
          phase={readiness.phase}
          readiness={readiness.readiness}
          onLocate={locateSection}
          onOpenEvidence={openEvidence}
          onReevaluate={() => { void readiness.reevaluate() }}
        />
      </aside>
    </div>
    <ReadinessSubmitDialog
      check={check}
      saving={editorProps.returningFromComplete}
      onClose={() => setCheck(null)}
      onConfirm={() => { setCheck(null); onSubmit() }}
    />
  </main>
}
