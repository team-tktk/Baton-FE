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
  /** 부족한 영역의 AI 보완을 시작한다. 배열 계약을 사용해 일괄 보완 흐름과 호환한다. */
  onFix?: (areas: ReadinessAreaResult[]) => void
  /** 점검 결과가 지금 문서와 맞지 않으면 보완을 시작할 수 없다(서버가 거절한다). */
  fixBlocked?: boolean
}

const GRADE_CLASS = { ready: styles.gradeReady, 'needs-improvement': styles.gradeImprove, 'not-ready': styles.gradeLow }

function StatusChip({ area }: { area: ReadinessAreaResult }) {
  return <span className={`${styles.chip} ${styles[area.status]}`}>{area.statusLabel}</span>
}

// 상태가 네 단계(충분·일부 부족·충돌·누락)뿐이라 막대도 그 비율만 보여 준다. 글자로 상태를 따로 적어 두므로 막대는 장식이다.
function StatusBar({ area }: { area: ReadinessAreaResult }) {
  return <span aria-hidden="true" className={styles.bar}><i className={styles[area.status]} style={{ width: `${area.percent}%` }} /></span>
}

function uniqueEvidence(evidence: ReadinessEvidence[]) {
  const grouped = new Map<string, ReadinessEvidence>()
  for (const item of evidence) {
    const existing = grouped.get(item.fileId)
    if (!existing) {
      grouped.set(item.fileId, item)
      continue
    }
    const locators = [...new Set([existing.locator, item.locator].filter(Boolean))]
    grouped.set(item.fileId, { ...existing, locator: locators.join(' · ') })
  }
  return [...grouped.values()]
}

function AreaDetail({ area, document, fixBlocked, onFix, onLocate, onOpenEvidence }: { area: ReadinessAreaResult } & Pick<ReadinessPanelProps, 'document' | 'fixBlocked' | 'onFix' | 'onLocate' | 'onOpenEvidence'>) {
  const editable = canEditInDocument(document, area.section)
  const evidence = uniqueEvidence(area.evidence)
  return <div className={styles.detail}>
    {area.summary && <p>{area.summary}</p>}
    {area.resolution && <p className={styles.resolution}><strong>해결 방법</strong>{area.resolution}</p>}
    {area.questions.length > 0 && <div className={styles.subList}>
      <strong>보완할 때 확인할 질문 {area.questions.length}개</strong>
      <ul>{area.questions.map((question) => <li key={question.question}>{question.question}</li>)}</ul>
    </div>}
    {area.deferredQuestions.length > 0 && <div className={`${styles.subList} ${styles.deferred}`}>
      <strong>나중에 답하기로 미룬 질문 {area.deferredQuestions.length}개</strong>
      <ul>{area.deferredQuestions.map((question) => <li key={question.id}>{question.question}</li>)}</ul>
    </div>}
    {evidence.length > 0 && <div className={styles.evidence}>
      <strong>관련 근거</strong>
      <ul>{evidence.map((item) => <li key={item.fileId}>
        {onOpenEvidence
          ? <button type="button" onClick={() => onOpenEvidence(item)}><Icon name="file" /><span>{item.fileName}</span>{item.locator && <small>{item.locator}</small>}</button>
          : <span className={styles.evidenceText}><Icon name="file" /><span>{item.fileName}</span>{item.locator && <small>{item.locator}</small>}</span>}
      </li>)}</ul>
    </div>}
    {(onFix || onLocate) && <div className={styles.actions}>
      {onFix && <button className={styles.fix} disabled={fixBlocked} type="button" onClick={() => onFix([area])}><Icon name="spark" />AI로 보완하기</button>}
      {onLocate && <button type="button" onClick={() => onLocate(area.section)}>{editable ? '문서에서 수정하기' : '문서에서 위치 보기'}</button>}
    </div>}
    {onFix && fixBlocked && <p className={styles.blockedNote}>문서가 점검 뒤에 바뀌었어요. 저장하고 다시 점검한 뒤 보완할 수 있어요.</p>}
  </div>
}

export function ReadinessPanel(props: ReadinessPanelProps) {
  const { dirty = false, error, onFix, onReevaluate, phase, readiness } = props
  const titleId = useId()
  const [selectedArea, setSelectedArea] = useState<ReadinessArea | null>(null)
  const evaluating = phase === 'evaluating'

  const header = <header className={styles.header}>
    <div><h2 id={titleId}>인수인계 준비도</h2><p>AI가 영역별로 판단하고, 점수는 정해진 배점으로 계산해요.</p></div>
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

  const keyIssues = readiness.areas.filter((area) => area.keyIssue)
  const remainingAreas = readiness.areas.filter((area) => !area.keyIssue)
  const activeArea = selectedArea
  const outdated = readiness.stale || dirty
  const selectable = (area: ReadinessAreaResult) => (
    <button aria-expanded={activeArea === area.area} className={styles.row} type="button" onClick={() => setSelectedArea((current) => current === area.area ? null : area.area)}>
      <span className={styles.rowLabel}>{area.label}<small>{area.weight}점</small></span><StatusBar area={area} /><StatusChip area={area} /><Icon name="chevron" />
    </button>
  )
  return <section aria-busy={evaluating} aria-labelledby={titleId} className={styles.panel}>
    {header}
    <div className={styles.score}>
      <p><strong>{readiness.score}</strong><span>점</span></p>
      <span className={`${styles.grade} ${GRADE_CLASS[readiness.grade]}`}>{readiness.gradeLabel}</span>
    </div>
    {evaluating && <p aria-live="polite" className={styles.working} role="status"><span className={styles.spinner} />다시 점검하고 있어요. 수십 초 걸릴 수 있어요.</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {outdated && !evaluating && <div className={styles.notice}>
      <p><Icon name="alert" />{dirty ? '고친 내용은 아직 점검에 반영되지 않았어요.' : '점검한 뒤 문서나 자료가 바뀌었어요.'} 저장하고 다시 점검하면 결과가 새로 정리돼요.</p>
      {onReevaluate && <button className={styles.primary} type="button" onClick={onReevaluate}>저장하고 다시 점검</button>}
    </div>}

    <section aria-label="영역별 준비도" className={styles.areaList}>
      <header>
        <div><h3>영역별 점검 결과</h3><p>항목을 선택하면 보완 방법과 관련 근거를 확인할 수 있어요.</p></div>
      </header>
      {keyIssues.length > 0 && <section aria-label="중요 항목" className={styles.priority}>
        <header><h4>중요 항목</h4><div className={styles.priorityActions}><span>{keyIssues.length}개 확인 필요</span></div></header>
        <ul>{keyIssues.map((area) => <li key={area.area}>
          {selectable(area)}
          {activeArea === area.area && <article aria-label={`${area.label} 자세히`} className={styles.card}>
            <AreaDetail area={area} document={props.document} fixBlocked={props.fixBlocked} onFix={props.onFix} onLocate={props.onLocate} onOpenEvidence={props.onOpenEvidence} />
          </article>}
        </li>)}</ul>
      </section>}
      {remainingAreas.length > 0 && <section aria-label="나머지 영역" className={styles.remaining}>
        <header><h4>나머지 영역</h4><span>{remainingAreas.length}개</span></header>
        <ul>{remainingAreas.map((area) => <li key={area.area}>
        {selectable(area)}
        {activeArea === area.area && <article aria-label={`${area.label} 자세히`} className={styles.card}>
          <AreaDetail area={area} document={props.document} fixBlocked={props.fixBlocked} onFix={props.onFix} onLocate={props.onLocate} onOpenEvidence={props.onOpenEvidence} />
        </article>}
        </li>)}</ul>
      </section>}
      {keyIssues.length > 0 && onFix && <button className={styles.bulkFix} disabled={props.fixBlocked} type="button" onClick={() => onFix(keyIssues)}><Icon name="spark" />한 번에 보완</button>}
    </section>
  </section>
}
