import { useId, useState } from 'react'

import type { DocumentSectionValue, ReadinessEvidence, ReadinessFix, ReadinessFixAnswer, ReadinessFixArea, ReadinessFixQuestion } from '@/entities/handover'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { Modal } from '@/shared/ui/modal'

import { describeSection } from '../model/sectionLines'
import type { FixSession } from '../model/useReadinessFix'
import { hasGenerated } from '../model/useReadinessFix'
import styles from './ReadinessFixDialog.module.css'

const ANSWER_LIMIT = 2000
const OTHER = '__other__'

interface ReadinessFixDialogProps {
  session: FixSession | null
  onGenerate: (answers: ReadinessFixAnswer[]) => void
  onApply: () => void
  onClose: () => void
  onOpenEvidence?: (evidence: ReadinessEvidence) => void
}

type Answers = Record<string, string>

function SectionValue({ compareTo, value }: { value: DocumentSectionValue; compareTo?: DocumentSectionValue | null }) {
  const described = describeSection(value, compareTo)
  const lines = compareTo ? described.filter((line) => line.added) : described
  if (lines.length === 0) return <p className={styles.blank}>새로 추가된 내용이 없어요</p>
  const text = value.section === 'PURPOSE' || value.section === 'COMPLETION_CRITERIA'
  return <ul className={styles.lines}>{lines.map((line, index) => (
    <li className={line.added ? styles.added : undefined} key={`${line.primary}-${index}`}>
      {line.secondary ? <details>
        <summary>
          {line.added && <em>{text ? '변경' : '추가'}</em>}
          <span>{line.primary}</span>
          <small>자세히</small>
        </summary>
        <p>{line.secondary}</p>
      </details> : <div className={styles.lineHeading}>
        {line.added && <em>{text ? '변경' : '추가'}</em>}
        <span>{line.primary}</span>
      </div>}
    </li>
  ))}</ul>
}

function EvidenceList({ items, onOpenEvidence }: { items: ReadinessEvidence[]; onOpenEvidence?: (evidence: ReadinessEvidence) => void }) {
  if (items.length === 0) return null
  return <ul className={styles.evidence}>{items.map((item) => {
    const content = <><Icon name="file" /><span>{item.fileName}</span>{item.locator && <small>{item.locator}</small>}</>
    return <li key={`${item.fileId}-${item.locator}`}>
      {onOpenEvidence ? <button type="button" onClick={() => onOpenEvidence(item)}>{content}</button> : <span>{content}</span>}
    </li>
  })}</ul>
}

// 선택지가 있으면 고르게 하고(충돌이면 자료별 값), 맞는 값이 없을 때를 위해 직접 입력도 둔다.
function QuestionField({ answer, busy, onChange, question }: { question: ReadinessFixQuestion; answer: string; busy: boolean; onChange: (value: string) => void }) {
  const id = useId()
  const [other, setOther] = useState(() => question.options.length > 0 && answer !== '' && !question.options.includes(answer))
  const label = <label htmlFor={`${id}-text`} id={`${id}-label`}>{question.question}{question.deferred && <em>나중에 답하기로 미룬 질문</em>}</label>
  return <li className={styles.question}>
    {question.options.length === 0 ? label : <span className={styles.questionTitle} id={`${id}-label`}>{question.question}{question.deferred && <em>나중에 답하기로 미룬 질문</em>}</span>}
    {question.reason && <p>{question.reason}</p>}
    {question.options.length > 0 && <div aria-labelledby={`${id}-label`} className={styles.options} role="radiogroup">
      {[...question.options, OTHER].map((option) => {
        const checked = option === OTHER ? other : !other && answer === option
        return <label className={checked ? styles.optionChecked : undefined} key={option}>
          <input
            checked={checked}
            disabled={busy}
            name={id}
            type="radio"
            onChange={() => { setOther(option === OTHER); onChange(option === OTHER ? '' : option) }}
          />
          {option === OTHER ? '직접 입력' : option}
        </label>
      })}
    </div>}
    {(question.options.length === 0 || other) && <textarea
      aria-labelledby={question.options.length > 0 ? `${id}-label` : undefined}
      disabled={busy}
      id={`${id}-text`}
      maxLength={ANSWER_LIMIT}
      placeholder={question.options.length > 0 ? '맞는 값을 적어 주세요' : '아는 만큼 적어 주세요'}
      rows={2}
      value={answer}
      onChange={(event) => onChange(event.target.value)}
    />}
  </li>
}

function AreaQuestions({ answers, area, busy, onAnswer }: { area: ReadinessFixArea; answers: Answers; busy: boolean; onAnswer: (questionId: string, value: string) => void }) {
  if (area.questions.length === 0) return <p className={styles.fromSources}>물어볼 것이 없어요. 업로드한 자료에서 찾아 채워요.</p>
  return <>
    {area.status === 'conflict' && <p className={styles.conflictHint}>자료마다 다르게 적혀 있어요. 맞는 값을 골라야 이 항목을 고칠 수 있어요.</p>}
    <ol className={styles.questions}>{area.questions.map((question) => (
      <QuestionField answer={answers[question.id] ?? ''} busy={busy} key={question.id} question={question} onChange={(value) => onAnswer(question.id, value)} />
    ))}</ol>
  </>
}

const chipClass = (area: ReadinessFixArea) => `${styles.chip} ${styles[area.status]}`

// 질문이 바뀌면(다시 만든 뒤 새 질문) 입력을 새로 채우도록 부모가 key로 새로 그린다.
function FixBody({ applying, busy, fix, onApply, onClose, onGenerate, onOpenEvidence }: {
  fix: ReadinessFix
  busy: boolean
  applying: boolean
  onGenerate: (answers: ReadinessFixAnswer[]) => void
  onApply: () => void
  onClose: () => void
  onOpenEvidence?: (evidence: ReadinessEvidence) => void
}) {
  const questions = fix.areas.flatMap((area) => area.questions)
  const [answers, setAnswers] = useState<Answers>(() => Object.fromEntries(questions.map((question) => [question.id, question.answer ?? ''])))
  const setAnswer = (questionId: string, value: string) => setAnswers((current) => ({ ...current, [questionId]: value }))
  // 새로 적었거나 고친 답만 보낸다. 서버는 같은 질문의 마지막 답을 쓴다.
  const changed = questions
    .map((question) => ({ questionId: question.id, answer: (answers[question.id] ?? '').trim(), saved: question.answer ?? '' }))
    .filter((item) => item.answer && item.answer !== item.saved)
    .map(({ answer, questionId }) => ({ questionId, answer }))
  const generated = hasGenerated(fix)

  if (!generated) {
    const questionAreas = fix.areas.filter((area) => area.questions.length > 0)
    const sourceAreaCount = fix.areas.length - questionAreas.length
    return <>
      <div className={styles.stepHeader}>
        <span>1단계 / 2단계</span>
        <strong>필요한 내용을 확인해 주세요</strong>
        <p>자료에서 찾을 수 없는 내용만 답하면, 답변과 자료를 합쳐 수정안을 만들어요.</p>
      </div>
      {sourceAreaCount > 0 && <p className={styles.savedNotice}><Icon name="check" />{sourceAreaCount}개 항목은 자료에서 찾아 채울 수 있어요.</p>}
      <div className={styles.areas}>{questionAreas.map((area) => (
        <section aria-label={`${area.label} 질문`} className={styles.area} key={area.area}>
          <header><strong>{area.label}</strong><span className={chipClass(area)}>{area.statusLabel}</span><small>고칠 곳: {area.sections.map((section) => section.label).join(' · ')}</small></header>
          <AreaQuestions answers={answers} area={area} busy={busy} onAnswer={setAnswer} />
        </section>
      ))}</div>
      <p className={styles.hint}>모르는 질문은 비워 둬도 돼요. 답이 부족한 항목은 AI가 한 번 더 물어볼 수 있어요.</p>
      <div className={styles.actions}>
        <Button disabled={busy} variant="ghost" onClick={onClose}>닫기</Button>
        <Button disabled={busy || fix.stale} onClick={() => onGenerate(changed)}><Icon name="spark" />AI로 수정안 만들기</Button>
      </div>
    </>
  }

  const proposed = fix.areas.filter((area) => area.proposed)
  const unresolved = fix.areas.filter((area) => !area.proposed)
  const needsAnswer = unresolved.filter((area) => area.questions.length > 0)
  const changes = fix.sections.filter((change) => change.changed && change.after)

  if (unresolved.length > 0) {
    return <>
      <div className={styles.stepHeader}>
        <span>1단계 / 2단계</span>
        <strong>{needsAnswer.length > 0 ? `${needsAnswer.length}가지만 더 확인해 주세요` : '수정안을 모두 만들지 못했어요'}</strong>
        <p>{needsAnswer.length > 0 ? '답변이 필요한 항목만 남겼어요. 답하면 전체 수정안을 완성해 다음 화면에서 보여드릴게요.' : '자료가 부족한 항목은 문서에서 직접 보완한 뒤 다시 시도해 주세요.'}</p>
      </div>
      {proposed.length > 0 && <p className={styles.savedNotice}><Icon name="check" />{proposed.length}개 항목은 이미 준비되어 있어요.</p>}
      {needsAnswer.length > 0 && <div className={styles.areas}>{needsAnswer.map((area) => (
        <section aria-label={`${area.label} 질문`} className={styles.area} key={area.area}>
          <header><strong>{area.label}</strong><span className={chipClass(area)}>{area.statusLabel}</span><small>반영 위치: {area.sections.map((section) => section.label).join(' · ')}</small></header>
          <AreaQuestions answers={answers} area={area} busy={busy} onAnswer={setAnswer} />
        </section>
      ))}</div>}
      {fix.stale && <p className={styles.error} role="alert">보완을 시작한 뒤 문서가 바뀌어 계속할 수 없어요. 다시 점검한 뒤 새로 보완해 주세요.</p>}
      <div className={styles.actions}>
        <Button disabled={busy} variant="ghost" onClick={onClose}>{needsAnswer.length > 0 ? '취소' : '닫기'}</Button>
        {needsAnswer.length > 0 && <Button disabled={busy || fix.stale || changed.length === 0} onClick={() => onGenerate(changed)}>답변 반영하고 계속</Button>}
      </div>
    </>
  }

  return <>
    <div className={styles.stepHeader}>
      <span>2단계 / 2단계</span>
      <strong>문서에 추가할 내용을 확인해 주세요</strong>
      <p>기존 내용은 반복하지 않고 새로 추가되거나 바뀌는 내용만 보여드려요.</p>
    </div>
    {proposed.some((area) => area.evidence.length > 0) && <details className={styles.sources}>
      <summary>참고한 자료 보기</summary>
      {proposed.map((area) => <EvidenceList items={area.evidence} key={area.area} onOpenEvidence={onOpenEvidence} />)}
    </details>}

    {/* 기존 내용은 반복하지 않고 이번 수정안에서 새로 추가되거나 바뀐 내용만 보여 준다. */}
    {changes.length > 0 && <div className={styles.changes}>
      {changes.map((change) => {
        const addedCount = describeSection(change.after!, change.before).filter((line) => line.added).length
        return <section aria-label={`${change.label} 수정 후`} key={change.section}>
        <header className={styles.sectionHeader}>
          <h3>{change.label}</h3>
          <span>{addedCount}개 {change.before ? '추가·변경' : '추가'}</span>
        </header>
        <div className={styles.after}><SectionValue compareTo={change.before} value={change.after!} /></div>
      </section>
      })}
    </div>}

    {fix.stale && <p className={styles.error} role="alert">보완을 시작한 뒤 문서가 바뀌어 적용할 수 없어요. 다시 점검한 뒤 새로 보완해 주세요.</p>}
    {proposed.length > 0 && <p className={styles.hint}>적용하면 위 내용이 문서에 표시돼요. 적용 후에도 문서에서 직접 수정할 수 있어요.</p>}
    <div className={styles.actions}>
      <Button disabled={busy} variant="ghost" onClick={onClose}>취소</Button>
      {proposed.length > 0 && <Button disabled={busy || fix.stale || fix.status !== 'proposed'} onClick={onApply}>{applying ? '적용하는 중…' : '문서에 적용'}</Button>}
    </div>
  </>
}

export function ReadinessFixDialog({ onApply, onClose, onGenerate, onOpenEvidence, session }: ReadinessFixDialogProps) {
  const phase = session?.phase
  const busy = phase === 'starting' || phase === 'generating' || phase === 'applying'
  // 적용 중에 닫으면 결과를 놓친 것처럼 보이므로 막는다.
  const close = () => { if (phase !== 'applying') onClose() }
  const title = !session ? '' : session.areas.length === 1 ? `${session.areas[0]!.label} 보완` : `항목 ${session.areas.length}개 보완`
  const fix = session?.fix ?? null

  return <Modal open={session !== null} size="wide" title={title} onClose={close}>
    {session && phase !== 'error' && (phase === 'starting' || phase === 'generating') && <div aria-live="polite" className={styles.working} role="status">
      <span className={styles.spinner} />
      {phase === 'starting'
        ? <p><strong>보완할 내용을 정리하고 있어요</strong>자료에 없는 것만 골라 물어볼게요.</p>
        : <p><strong>AI가 자료와 답변으로 수정안을 만들고 있어요</strong>수십 초 걸릴 수 있어요. 문서는 적용하기 전까지 바뀌지 않아요.</p>}
    </div>}
    {session?.error && <p className={styles.error} role="alert">{session.error}</p>}
    {phase === 'error' && <div className={styles.actions}><Button onClick={onClose}>닫기</Button></div>}
    {/* 만드는 동안에도 입력 화면을 남겨(비활성) 저장 전 실패해도 적은 답이 사라지지 않게 한다. */}
    {fix && phase !== 'starting' && (
      <FixBody
        applying={phase === 'applying'}
        busy={busy}
        fix={fix}
        key={fix.areas.flatMap((area) => area.questions.map((question) => question.id)).join()}
        onApply={onApply}
        onClose={onClose}
        onGenerate={onGenerate}
        onOpenEvidence={onOpenEvidence}
      />
    )}
  </Modal>
}
