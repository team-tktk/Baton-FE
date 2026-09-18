import { useState } from 'react'

import type { DocumentSectionValue, ReadinessEvidence, ReadinessFix, ReadinessFixAnswer } from '@/entities/handover'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { Modal } from '@/shared/ui/modal'

import { describeSection } from '../model/sectionLines'
import type { FixSession } from '../model/useReadinessFix'
import styles from './ReadinessFixDialog.module.css'

const ANSWER_LIMIT = 2000

interface ReadinessFixDialogProps {
  session: FixSession | null
  onAnswer: (answers: ReadinessFixAnswer[]) => void
  onApply: () => void
  onClose: () => void
  onOpenEvidence?: (evidence: ReadinessEvidence) => void
}

function SectionValue({ compareTo, value }: { value: DocumentSectionValue; compareTo?: DocumentSectionValue | null }) {
  const lines = describeSection(value, compareTo)
  if (lines.length === 0) return <p className={styles.blank}>비어 있어요</p>
  const text = value.section === 'PURPOSE' || value.section === 'COMPLETION_CRITERIA'
  return <ul className={styles.lines}>{lines.map((line, index) => (
    <li className={line.added ? styles.added : undefined} key={`${line.primary}-${index}`}>
      {line.added && <em>{text ? '바뀐 내용' : '새로 추가'}</em>}
      <span>{line.primary}</span>
      {line.secondary && <small>{line.secondary}</small>}
    </li>
  ))}</ul>
}

function Evidence({ fix, onOpenEvidence }: { fix: ReadinessFix; onOpenEvidence?: (evidence: ReadinessEvidence) => void }) {
  if (fix.evidence.length === 0) return null
  return <div className={styles.evidence}>
    <strong>참고한 자료</strong>
    <ul>{fix.evidence.map((item) => <li key={`${item.fileId}-${item.locator}`}>
      {onOpenEvidence
        ? <button type="button" onClick={() => onOpenEvidence(item)}><Icon name="file" /><span>{item.fileName}</span>{item.locator && <small>{item.locator}</small>}</button>
        : <span><Icon name="file" /><span>{item.fileName}</span>{item.locator && <small>{item.locator}</small>}</span>}
    </li>)}</ul>
  </div>
}

// 질문이 바뀌면(다시 NEEDS_INPUT) 입력을 비우도록 부모가 key로 새로 그린다.
function QuestionForm({ busy, fix, onAnswer, onClose }: { busy: boolean; fix: ReadinessFix; onAnswer: (answers: ReadinessFixAnswer[]) => void; onClose: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries(fix.questions.map((question) => [question.id, question.answer ?? ''])))
  const filled = fix.questions
    .map((question) => ({ questionId: question.id, answer: (answers[question.id] ?? '').trim() }))
    .filter((item) => item.answer)
  return <form onSubmit={(event) => { event.preventDefault(); if (filled.length > 0) onAnswer(filled) }}>
    <p className={styles.lead}>자료에서 {fix.sectionLabel}에 넣을 내용을 찾지 못했어요. 아는 만큼 답해 주면 수정안을 만들어 드려요.</p>
    <ol className={styles.questions}>{fix.questions.map((question, index) => (
      <li key={question.id}>
        <label htmlFor={`fix-question-${question.id}`}><span>질문 {index + 1}</span>{question.question}</label>
        {question.reason && <p>{question.reason}</p>}
        <textarea
          disabled={busy}
          id={`fix-question-${question.id}`}
          maxLength={ANSWER_LIMIT}
          rows={3}
          value={answers[question.id] ?? ''}
          onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
        />
      </li>
    ))}</ol>
    <p className={styles.hint}>모르는 질문은 비워 둬도 돼요. 답이 부족하면 AI가 한 번 더 물어볼 수 있어요.</p>
    <div className={styles.actions}>
      <Button disabled={busy} type="button" variant="ghost" onClick={onClose}>닫기</Button>
      <Button disabled={busy || filled.length === 0} type="submit">{busy ? '수정안을 만드는 중…' : '답변하고 수정안 받기'}</Button>
    </div>
  </form>
}

export function ReadinessFixDialog({ onAnswer, onApply, onClose, onOpenEvidence, session }: ReadinessFixDialogProps) {
  const applying = session?.phase === 'applying'
  const fix = session?.fix ?? null
  const title = session ? `${session.area.label} 보완` : ''
  // 적용 중에 닫으면 결과를 놓친 것처럼 보이므로 막는다.
  const close = () => { if (!applying) onClose() }

  const body = () => {
    if (!session) return null
    if (session.phase === 'creating') {
      return <div aria-live="polite" className={styles.working} role="status">
        <span className={styles.spinner} />
        <p><strong>AI가 자료를 찾아 보완안을 만들고 있어요</strong>수십 초 걸릴 수 있어요. 문서는 사용자가 적용하기 전까지 바뀌지 않아요.</p>
      </div>
    }
    if (!fix) {
      return <>
        <p className={styles.error} role="alert">{session.error}</p>
        <div className={styles.actions}><Button onClick={onClose}>닫기</Button></div>
      </>
    }
    if (fix.status === 'needs-input') {
      return <>
        {session.error && <p className={styles.error} role="alert">{session.error}</p>}
        <QuestionForm busy={session.phase === 'answering'} fix={fix} key={fix.questions.map((question) => question.id).join()} onAnswer={onAnswer} onClose={onClose} />
      </>
    }
    const blocked = fix.stale || session.phase === 'error'
    return <>
      {fix.changeSummary && <p className={styles.lead}>{fix.changeSummary}</p>}
      <div className={styles.compare}>
        <section aria-label="수정 전"><h3>수정 전</h3><SectionValue value={fix.before} /></section>
        <section aria-label="수정 후" className={styles.after}><h3>수정 후</h3>{fix.after ? <SectionValue compareTo={fix.before} value={fix.after} /> : <p className={styles.blank}>수정안이 없어요</p>}</section>
      </div>
      <Evidence fix={fix} onOpenEvidence={onOpenEvidence} />
      {fix.stale && <p className={styles.error} role="alert">보완안을 만든 뒤 문서가 바뀌어 적용할 수 없어요. 다시 평가한 뒤 새로 보완해 주세요.</p>}
      {session.error && <p className={styles.error} role="alert">{session.error}</p>}
      <p className={styles.hint}>적용하면 {fix.sectionLabel} 섹션만 이 내용으로 바뀌고 점수를 다시 계산해요. 적용한 뒤에도 문서에서 직접 고칠 수 있어요.</p>
      <div className={styles.actions}>
        <Button disabled={applying} variant="ghost" onClick={onClose}>취소</Button>
        <Button disabled={applying || blocked || !fix.after} onClick={onApply}>{applying ? '적용하는 중…' : '문서에 적용'}</Button>
      </div>
    </>
  }

  return <Modal open={session !== null} size="wide" title={title} onClose={close}>
    {session && <p className={styles.section}>{session.area.sectionLabel} · {session.area.statusLabel}{session.area.summary && ` — ${session.area.summary}`}</p>}
    {body()}
  </Modal>
}
