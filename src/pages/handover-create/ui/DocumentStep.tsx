import { useEffect, useMemo, useRef, useState } from 'react'

import type { DocumentSection, Handover, HandoverDraft, ReadinessArea, ReadinessEvidence, ReadinessFixApplied } from '@/entities/handover'
import { useHandoverRepository } from '@/entities/handover'
import type { SubmitCheck } from '@/features/check-readiness'
import { ReadinessFixDialog, ReadinessFixReviewPanel, ReadinessPanel, ReadinessSubmitDialog, appliedMessage, buildSelectedFixDocument, checkBeforeSubmit, getFixPreviewItems, hasGenerated, sectionElementId, toDraftIssues, useDocumentReadiness, useReadinessFix } from '@/features/check-readiness'
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
  /** 보완을 적용해 서버가 돌려준 문서로 바꾼다. */
  onDraftReplaced: (draft: HandoverDraft) => void
  /** 그사이 다른 곳에서 문서가 바뀌었을 때 최신 문서를 다시 읽는다. */
  onReloadDocument: () => Promise<void>
  onFeedback: (message: string) => void
  onFieldChange: (field: string, value: string) => void
  onSubmit: () => void
}

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// 짚은 섹션으로 옮기고, 강조 문장이 있으면 그 칸에, 없으면 첫 편집 칸에 커서를 둔다.
function locateSection(section: DocumentSection, focus = true) {
  const target = window.document.getElementById(sectionElementId(section))
  if (!target) return null
  target.scrollIntoView?.({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  if (focus) {
    const field = target.querySelector<HTMLElement>('[role="textbox"][data-highlighted="true"]') ?? target.querySelector<HTMLElement>('[role="textbox"]')
    field?.focus({ preventScroll: true })
  }
  return target
}

export function DocumentStep({ dirty, handover, handoverId, onDraftReplaced, onReloadDocument, onSubmit, revision, saveDraft, ...editorProps }: DocumentStepProps) {
  const repository = useHandoverRepository()
  const readiness = useDocumentReadiness({ handoverId, saveDraft })
  const [check, setCheck] = useState<SubmitCheck | null>(null)
  const issues = useMemo(() => toDraftIssues(readiness.readiness), [readiness.readiness])
  // 평가 뒤 문서가 바뀌면 서버가 보완을 거절한다(READINESS_STALE). 먼저 저장하고 다시 평가하게 한다.
  const fixBlocked = dirty || Boolean(readiness.readiness?.stale) || readiness.phase === 'evaluating'

  // 적용한 섹션. 새 문서가 그려진 뒤(revision이 바뀐 뒤) 그 자리로 옮겨 잠깐 강조한다.
  const appliedSection = useRef<DocumentSection | null>(null)
  useEffect(() => {
    const section = appliedSection.current
    if (!section) return
    appliedSection.current = null
    const target = locateSection(section, false)
    target?.setAttribute('data-just-applied', 'true')
    const timer = setTimeout(() => target?.removeAttribute('data-just-applied'), 2600)
    return () => { clearTimeout(timer); target?.removeAttribute('data-just-applied') }
  }, [revision])

  const applied = (result: ReadinessFixApplied) => {
    const previous = readiness.readiness
    appliedSection.current = result.fix.sections.find((change) => change.changed)?.section ?? null
    onDraftReplaced(result.draft)
    if (result.readiness) readiness.replaceReadiness(result.readiness)
    else void readiness.reevaluate()
    editorProps.onFeedback(appliedMessage(result, previous))
  }
  const fix = useReadinessFix({
    handoverId,
    revision,
    onApplied: applied,
    onConflict: () => { void onReloadDocument().then(() => readiness.refresh()) },
  })
  const reviewFix = fix.session?.fix && hasGenerated(fix.session.fix) && fix.session.fix.areas.every((area) => area.proposed)
    ? fix.session.fix
    : null
  const previewItems = useMemo(() => reviewFix ? getFixPreviewItems(reviewFix) : [], [reviewFix])
  const [excluded, setExcluded] = useState<{ fixId: string | null; ids: Set<string> }>({ fixId: null, ids: new Set() })
  const selectedIds = useMemo(() => {
    const excludedIds = excluded.fixId === reviewFix?.id ? excluded.ids : new Set<string>()
    return new Set(previewItems.filter((item) => !excludedIds.has(item.id)).map((item) => item.id))
  }, [excluded, previewItems, reviewFix?.id])
  const previewDocument = useMemo(
    () => reviewFix ? buildSelectedFixDocument(handover.document, reviewFix, selectedIds) : handover.document,
    [handover.document, reviewFix, selectedIds],
  )
  const excludeProposal = (id: string) => setExcluded((current) => {
    const ids = current.fixId === reviewFix?.id ? new Set(current.ids) : new Set<string>()
    ids.add(id)
    return { fixId: reviewFix?.id ?? null, ids }
  })
  const restoreProposals = () => setExcluded({ fixId: reviewFix?.id ?? null, ids: new Set() })
  const applyProposals = () => {
    if (!reviewFix || selectedIds.size === 0) return
    if (selectedIds.size === previewItems.length) void fix.apply()
    else void fix.apply(buildSelectedFixDocument(handover.document, reviewFix, selectedIds))
  }
  const startFix = (areas: ReadinessArea[]) => {
    const targets = readiness.readiness?.areas.filter((item) => areas.includes(item.area) && item.status !== 'sufficient') ?? []
    if (targets.length > 0 && !fixBlocked) void fix.start(targets)
  }

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
        <HandoverDraftEditor
          key={revision ?? 'draft'}
          {...editorProps}
          fillBlocked={fixBlocked}
          fixPreview={reviewFix ? { document: previewDocument, items: previewItems, selectedIds, onExclude: excludeProposal } : undefined}
          handover={handover}
          issues={issues}
          onFillSection={(area) => startFix([area])}
          onSubmit={submit}
        />
      </div>
      <aside className={styles.aside}>
        {reviewFix && fix.session ? <ReadinessFixReviewPanel
          error={fix.session.error}
          fix={reviewFix}
          items={previewItems}
          phase={fix.session.phase}
          selectedIds={selectedIds}
          onApply={applyProposals}
          onCancel={fix.close}
          onLocate={(section) => { locateSection(section, false) }}
          onRestoreAll={restoreProposals}
        /> : <ReadinessPanel
          dirty={dirty}
          document={handover.document}
          error={readiness.error}
          phase={readiness.phase}
          fixBlocked={fixBlocked}
          readiness={readiness.readiness}
          onFix={(areas) => startFix(areas.map((area) => area.area))}
          onLocate={(section) => { locateSection(section) }}
          onOpenEvidence={openEvidence}
          onReevaluate={() => { void readiness.reevaluate() }}
        />}
      </aside>
    </div>
    <ReadinessFixDialog
      session={reviewFix ? null : fix.session}
      onGenerate={(answers) => { void fix.generate(answers) }}
      onApply={() => { void fix.apply() }}
      onClose={fix.close}
      onOpenEvidence={openEvidence}
    />
    <ReadinessSubmitDialog
      check={check}
      saving={editorProps.returningFromComplete}
      onClose={() => setCheck(null)}
      onConfirm={() => { setCheck(null); onSubmit() }}
    />
  </main>
}
