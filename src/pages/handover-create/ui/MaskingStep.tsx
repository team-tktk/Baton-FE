import { useRef, useState } from 'react'

import type { HandoverAttachment } from '@/entities/handover'
import { MaskedDocument, MaskingPanel, markElementId, rowElementId, useMaskingReview } from '@/features/review-masking'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { Modal } from '@/shared/ui/modal'

import styles from './MaskingStep.module.css'

interface MaskingStepProps {
  attachments: HandoverAttachment[]
  handoverId: string | null
  onAttachmentsChange: (attachments: HandoverAttachment[]) => void
  onBack: () => void
  onFeedback: (message: string) => void
  onProceed: () => void
}

const scrollToElement = (id: string) => document.getElementById(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })

export function MaskingStep({ attachments, handoverId, onAttachmentsChange, onBack, onFeedback, onProceed }: MaskingStepProps) {
  const review = useMaskingReview({ attachments, handoverId, onAttachmentsChange, onFeedback })
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  const activeFile = review.reviewFiles.find((file) => file.id === review.activeFileId) ?? null
  const activeReview = activeFile ? review.reviews[activeFile.id] : undefined
  const stillReading = attachments.some((file) => file.status === 'processing')
  const busy = review.progress !== null

  const selectFromDocument = (candidateId: string) => {
    setSelectedCandidateId(candidateId)
    scrollToElement(rowElementId(candidateId))
  }
  const selectFromList = (candidateId: string) => {
    setSelectedCandidateId(candidateId)
    scrollToElement(markElementId(candidateId))
  }

  const confirm = async () => {
    setConfirmOpen(false)
    if (await review.confirmAll()) onProceed()
  }

  const heading = (
    <header className={styles.heading}>
      <div className={styles.kicker}><Icon name="shield" /> 인수인계 하기 · 민감정보 확인</div>
      <h1>AI에 보내기 전에 민감정보를 가려요</h1>
      <p>연락처·계좌번호처럼 남에게 보이면 안 되는 정보를 찾아 두었어요. 가릴지 확인하고 확정하면 분석을 시작해요.</p>
    </header>
  )

  if (review.loadError) {
    return (
      <main className={styles.main}>
        {heading}
        <div className={styles.notice} role="alert">
          <h2>검수 내용을 불러오지 못했어요</h2>
          <p>{review.loadError}</p>
          <Button variant="secondary" onClick={review.reload}>다시 불러오기</Button>
        </div>
        <footer className={styles.actions}><Button variant="ghost" onClick={onBack}>이전으로</Button></footer>
      </main>
    )
  }

  if (review.reviewFiles.length === 0) {
    return (
      <main className={styles.main}>
        {heading}
        <div className={styles.notice}>
          <span className={styles.noticeIcon}><Icon name={stillReading ? 'file' : 'check'} /></span>
          <h2>{stillReading ? '아직 파일을 읽고 있어요' : '검수할 민감정보가 없어요'}</h2>
          <p>{stillReading ? '읽기가 끝나면 찾은 민감정보를 여기에 보여 드릴게요.' : '검수가 필요한 파일이 없거나 이미 확정했어요. 바로 분석을 시작할 수 있어요.'}</p>
        </div>
        <footer className={styles.actions}>
          <Button variant="ghost" onClick={onBack}>이전으로</Button>
          <Button disabled={stillReading} onClick={onProceed}>AI 분석 시작 <Icon name="arrow" /></Button>
        </footer>
      </main>
    )
  }

  return (
    <main className={`${styles.main} ${styles.wide}`}>
      {heading}

      {review.reviewFiles.length > 1 && (
        <div aria-label="검수할 파일" className={styles.files} role="group">
          {review.reviewFiles.map((file) => {
            const fileReview = review.reviews[file.id]
            const state = fileReview?.confirmed ? '확정됨' : fileReview ? (fileReview.summary.remaining > 0 ? `확인 필요 ${fileReview.summary.remaining}` : '확인 완료') : '불러오는 중'
            return (
              <button aria-pressed={file.id === review.activeFileId} key={file.id} type="button" onClick={() => { review.selectFile(file.id); setSelectedCandidateId(null) }}>
                <Icon name="file" />
                <span>{file.name}</span>
                <em className={fileReview && !fileReview.confirmed && fileReview.summary.remaining > 0 ? styles.fileAttention : ''}>{state}</em>
              </button>
            )
          })}
        </div>
      )}

      <div className={styles.grid}>
        <section aria-label="원문 미리보기" className={styles.viewer}>
          <header>
            <Icon name="file" />
            <strong>{activeFile?.name}</strong>
            <span>드래그해서 직접 가릴 수 있어요 · AI가 읽은 텍스트 기준</span>
          </header>
          {!activeReview ? (
            <p className={styles.placeholder}>검수 내용을 불러오는 중이에요…</p>
          ) : activeReview.confirmed || activeReview.text === null ? (
            <p className={styles.placeholder}>검수를 확정했어요. 원문은 서버에서 삭제되고 가린 내용만 남았어요.</p>
          ) : (
            <MaskedDocument
              candidates={activeReview.candidates}
              fileName={activeReview.fileName}
              key={activeReview.fileId}
              selectedId={selectedCandidateId}
              text={activeReview.text}
              onAddRange={busy ? undefined : async (range) => {
                const added = await review.addRange(activeReview.fileId, range)
                if (added) setSelectedCandidateId(added.id)
              }}
              onSelect={selectFromDocument}
            />
          )}
        </section>

        <aside className={styles.side}>
          {activeReview && activeFile && (
            <MaskingPanel
              candidates={activeReview.candidates}
              confirmed={activeReview.confirmed}
              disabled={busy}
              savingIds={review.savingIds}
              selectedId={selectedCandidateId}
              summary={activeReview.summary}
              onSelect={selectFromList}
              onRemove={(candidateId) => { void review.removeCandidate(activeFile.id, candidateId) }}
              onToggle={(candidateId, applied) => { void review.toggle(activeFile.id, candidateId, applied) }}
            />
          )}
        </aside>
      </div>

      <footer className={styles.actions}>
        <Button disabled={busy} variant="ghost" onClick={onBack}>이전으로</Button>
        <div className={styles.confirmArea}>
          <p aria-live="polite" className={styles.hint}>
            {review.progress?.phase === 'confirming'
              ? `파일 확정 중 ${review.progress.done} / ${review.progress.total}`
              : review.progress?.phase === 'indexing'
                ? 'AI가 읽을 수 있게 가린 내용을 정리하고 있어요…'
                : review.remaining > 0
                  ? `확인이 필요한 항목 ${review.remaining}개를 먼저 확인해 주세요`
                  : review.loading ? '검수 내용을 불러오는 중이에요' : '확정하면 원문은 되돌릴 수 없어요'}
          </p>
          <Button disabled={!review.canConfirm} ref={confirmButtonRef} onClick={() => setConfirmOpen(true)}>
            {busy ? '확정하는 중…' : '확정하고 AI 분석 시작'}
          </Button>
        </div>
      </footer>

      <Modal open={confirmOpen} returnFocusRef={confirmButtonRef} title="민감정보 검수를 확정할까요?" onClose={() => setConfirmOpen(false)}>
        <ul className={styles.confirmFacts}>
          <li>파일 {review.openFileCount}개, 가려질 항목 {review.applied}개</li>
          <li>확정하면 원문은 서버에서 삭제되어 되돌릴 수 없어요</li>
          <li>AI 분석과 질의응답에는 가린 내용만 쓰여요</li>
        </ul>
        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>취소</Button>
          <Button onClick={() => { void confirm() }}>확정하고 분석 시작</Button>
        </div>
      </Modal>
    </main>
  )
}
