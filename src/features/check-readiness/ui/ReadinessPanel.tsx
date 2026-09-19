import { useId, useState } from 'react'

import type { DocumentSection, HandoverDocument, HandoverReadiness, ReadinessArea, ReadinessAreaResult, ReadinessEvidence } from '@/entities/handover'
import { Icon } from '@/shared/ui/icon'

import { canEditInDocument } from '../model/draftIssues'
import type { ReadinessPhase } from '../model/useDocumentReadiness'
import styles from './ReadinessPanel.module.css'

interface ReadinessPanelProps {
  readiness: HandoverReadiness | null
  phase: ReadinessPhase
  error: string | null
  /** 문서 내용. "문서에서 수정하기"를 보여 줄지 정한다. */
  document: HandoverDocument
  /** 화면에서 고친 내용이 아직 점검에 반영되지 않았는지 */
  dirty?: boolean
  /** 아래 콜백이 없으면 해당 버튼을 그리지 않는다(검토자용 읽기 전용 패널). */
  onReevaluate?: () => void
  onLocate?: (section: DocumentSection) => void
  onOpenEvidence?: (evidence: ReadinessEvidence) => void
  /** 고른 영역들의 AI 보완을 시작한다(하나 또는 여러 개). */
  onFix?: (areas: ReadinessAreaResult[]) => void
  /** 점검 결과가 지금 문서와 맞지 않으면 보완을 시작할 수 없다(서버가 거절한다). */
  fixBlocked?: boolean
}

const GRADE_CLASS = { ready: styles.gradeReady, 'needs-improvement': styles.gradeImprove, 'not-ready': styles.gradeLow }
const BLOCKED_NOTE = '문서가 점검 뒤에 바뀌었어요. 저장하고 다시 점검한 뒤 보완할 수 있어요.'

function StatusChip({ area }: { area: ReadinessAreaResult }) {
  return <span className={`${styles.chip} ${styles[area.status]}`}>{area.statusLabel}</span>
}

function EvidenceItem({ item, onOpenEvidence }: { item: ReadinessEvidence; onOpenEvidence?: (evidence: ReadinessEvidence) => void }) {
  const place = item.page ? `${item.page}쪽` : item.locator
  const content = <><Icon name="file" /><span>{item.fileName}</span>{place && <small>{place}</small>}</>
  return <li>
    {onOpenEvidence
      ? <button type="button" onClick={() => onOpenEvidence(item)}>{content}</button>
      : <span className={styles.evidenceText}>{content}</span>}
    {item.quote && <q>{item.quote}</q>}
  </li>
}

function AreaDetail({ area, document, fixBlocked, onFix, onLocate, onOpenEvidence }: { area: ReadinessAreaResult } & Pick<ReadinessPanelProps, 'document' | 'fixBlocked' | 'onFix' | 'onLocate' | 'onOpenEvidence'>) {
  const editable = canEditInDocument(document, area.section)
  return <div className={styles.detail}>
    {area.summary && <p>{area.summary}</p>}
    {area.resolution && <p className={styles.resolution}><strong>해결 방법</strong>{area.resolution}</p>}
    <p className={styles.meta}><strong>고칠 곳</strong>{area.targetSections.map((target) => target.label).join(' · ')}</p>
    {area.questions.length > 0 && <div className={styles.subList}>
      <strong>보완할 때 물어볼 질문 {area.questions.length}개</strong>
      <ul>{area.questions.map((question) => <li key={question.question}>{question.question}</li>)}</ul>
    </div>}
    {area.deferredQuestions.length > 0 && <div className={`${styles.subList} ${styles.deferred}`}>
      <strong>나중에 답하기로 미룬 질문 {area.deferredQuestions.length}개</strong>
      <ul>{area.deferredQuestions.map((question) => <li key={question.id}>{question.question}</li>)}</ul>
      {onFix && <small>AI로 보완할 때 함께 물어봐요.</small>}
    </div>}
    {area.evidence.length > 0 && <div className={styles.evidence}>
      <strong>관련 근거</strong>
      <ul>{area.evidence.map((item) => <EvidenceItem item={item} key={`${item.fileId}-${item.locator}-${item.page ?? ''}`} onOpenEvidence={onOpenEvidence} />)}</ul>
    </div>}
    {(onFix || onLocate) && <div className={styles.actions}>
      {onFix && <button className={styles.fix} disabled={fixBlocked} type="button" onClick={() => onFix([area])}><Icon name="spark" />이 항목만 AI로 보완</button>}
      {onLocate && <button type="button" onClick={() => onLocate(area.section)}>{editable ? '문서에서 수정하기' : '문서에서 위치 보기'}</button>}
    </div>}
    {onFix && fixBlocked && <p className={styles.blockedNote}>{BLOCKED_NOTE}</p>}
  </div>
}

export function ReadinessPanel(props: ReadinessPanelProps) {
  const { dirty = false, error, fixBlocked = false, onFix, onReevaluate, phase, readiness } = props
  const titleId = useId()
  const [selected, setSelected] = useState<ReadinessArea | null>(null)
  // 기본은 모두 보완한다. 새로 점검해 생긴 항목도 자동으로 포함되게 뺀 것만 기억한다.
  const [excluded, setExcluded] = useState<ReadinessArea[]>([])
  const evaluating = phase === 'evaluating'

  const header = <header className={styles.header}>
    <span className={styles.icon}><Icon name="target" /></span>
    <div><h2 id={titleId}>인수인계 준비도</h2><p>AI가 문서를 영역별로 점검했어요. 확인할 항목을 채우면 받는 사람이 덜 헤매요.</p></div>
  </header>

  if (!readiness) {
    return <section aria-labelledby={titleId} className={styles.panel}>
      {header}
      {phase === 'error'
        ? <div className={styles.empty} role="alert">
          <p>{error ?? '준비도를 확인하지 못했어요.'}</p>
          {onReevaluate && <button className={styles.primary} type="button" onClick={onReevaluate}>다시 시도</button>}
        </div>
        : <div aria-live="polite" className={styles.empty} role="status">
          <span className={styles.spinner} />
          <p><strong>{evaluating ? '문서를 점검하고 있어요' : '준비도를 불러오고 있어요'}</strong>
            {evaluating && '영역 8개를 하나씩 살펴보느라 수십 초 걸릴 수 있어요. 기다리는 동안 문서를 계속 고쳐도 돼요.'}</p>
        </div>}
    </section>
  }

  const openAreas = readiness.areas.filter((area) => area.status !== 'sufficient')
  const settled = readiness.areas.filter((area) => area.status === 'sufficient')
  const chosen = openAreas.filter((area) => !excluded.includes(area.area))
  // 다시 점검해 고른 항목이 충분해지면 다음 항목을 보여 준다.
  const current = openAreas.find((area) => area.area === selected) ?? openAreas[0] ?? null
  const outdated = readiness.stale || dirty
  const toggle = (area: ReadinessArea) => setExcluded((items) => items.includes(area) ? items.filter((item) => item !== area) : [...items, area])

  return <section aria-busy={evaluating} aria-labelledby={titleId} className={styles.panel}>
    {header}
    <div className={styles.status}>
      <span className={`${styles.grade} ${GRADE_CLASS[readiness.grade]}`}>{readiness.gradeLabel}</span>
      <p>{openAreas.length > 0 ? <>확인할 항목 <strong>{openAreas.length}개</strong></> : '확인할 항목이 없어요'}</p>
      {readiness.deferredQuestionCount > 0 && <small>나중에 답하기 {readiness.deferredQuestionCount}개</small>}
    </div>

    {evaluating && <p aria-live="polite" className={styles.working} role="status"><span className={styles.spinner} />다시 점검하고 있어요. 수십 초 걸릴 수 있어요.</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {outdated && !evaluating && <div className={styles.notice}>
      <p><Icon name="alert" />{dirty ? '고친 내용은 아직 점검에 반영되지 않았어요.' : '점검한 뒤 문서나 자료가 바뀌었어요.'} 저장하고 다시 점검하면 확인할 항목이 새로 정리돼요.</p>
      {onReevaluate && <button className={styles.primary} type="button" onClick={onReevaluate}>저장하고 다시 점검</button>}
    </div>}

    {openAreas.length === 0
      ? <p className={styles.clear}>모든 영역이 충분해요. 바로 전달해도 좋아요.</p>
      : <section aria-label="확인할 항목" className={styles.checklist}>
        <ul>{openAreas.map((area) => (
          <li className={current?.area === area.area ? styles.current : undefined} key={area.area}>
            {onFix && <input
              aria-label={`${area.label} 보완에 포함`}
              checked={!excluded.includes(area.area)}
              disabled={fixBlocked}
              type="checkbox"
              onChange={() => toggle(area.area)}
            />}
            <button aria-pressed={current?.area === area.area} className={styles.row} type="button" onClick={() => setSelected(area.area)}>
              <span className={styles.rowLabel}>{area.label}{area.keyIssue && <em>중요</em>}</span>
              <StatusChip area={area} />
              <Icon name="chevron" />
            </button>
          </li>
        ))}</ul>
        {onFix && <>
          <button className={styles.fixAll} disabled={fixBlocked || chosen.length === 0} type="button" onClick={() => onFix(chosen)}>
            <Icon name="spark" />{chosen.length === openAreas.length ? `확인할 항목 ${chosen.length}개 AI로 보완하기` : `선택한 ${chosen.length}개 AI로 보완하기`}
          </button>
          {fixBlocked && <p className={styles.blockedNote}>{BLOCKED_NOTE}</p>}
        </>}
      </section>}

    {current && <article aria-label={`${current.label} 자세히`} className={styles.card}>
      <header><strong>{current.label}</strong><StatusChip area={current} /></header>
      <AreaDetail area={current} document={props.document} fixBlocked={fixBlocked} onFix={onFix} onLocate={props.onLocate} onOpenEvidence={props.onOpenEvidence} />
    </article>}

    {settled.length > 0 && <details className={styles.all}>
      <summary>충분한 항목 {settled.length}개 보기 <Icon name="chevron" /></summary>
      <ul>{settled.map((area) => <li className={styles.row} key={area.area}><span className={styles.rowLabel}>{area.label}</span><StatusChip area={area} /></li>)}</ul>
    </details>}
  </section>
}
