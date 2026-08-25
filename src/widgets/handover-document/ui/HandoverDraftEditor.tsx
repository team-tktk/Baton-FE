import type { ReactNode } from 'react'

import type { Handover, HandoverTask } from '@/entities/handover'
import { EditableField, InlineConfirmation } from '@/features/edit-handover'
import { ExportHandoverActions } from '@/features/export-handover'
import { Icon } from '@/shared/ui/icon'

import styles from './HandoverDraftEditor.module.css'

interface HandoverDraftEditorProps {
  handover: Handover
  confirmations: Record<string, string>
  pending: boolean
  returningFromComplete: boolean
  onConfirm: (criterionId: string, value: string) => void
  onFeedback: (message: string) => void
  onFieldChange: (field: string, value: string) => void
  onSubmit: () => void
}

const scheduleRows = [
  ['매일', '주문·배송 이상 확인', '오전 10시 전 확인'],
  ['매주 월요일', '주문 현황 집계', '반품과 문의 포함해 공유'],
  ['매월 말', '행사 실적 정리', '다음 달 개선점 기록'],
]

const accessRows = [
  ['운영 어드민', '주문 조회·행사 설정', '사용 가능'],
  ['공유 드라이브', '운영팀 자료 편집', '사용 가능'],
  ['배송업체 포털', '신청·반품 조회', '초대 필요'],
]

function MockTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return <div className={styles.tableWrap}><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>
}

export function HandoverDraftEditor(props: HandoverDraftEditorProps) {
  const { handover, confirmations, onFieldChange } = props
  const document = handover.document
  const edit = (label: string, key: string, value: string) => <EditableField seamless label={label} value={value} onChange={(next) => onFieldChange(key, next)} />
  const criterionById = new Map(document.criteria.map((criterion) => [criterion.id, criterion]))
  const renderTasks = (items: HandoverTask[]) => items.map((task) => {
    const criterion = task.criterionId ? criterionById.get(task.criterionId) : undefined
    return <article className={styles.task} key={task.id}>
      <header>
        <span className={`${styles.taskStatus} ${styles[task.tone]}`}>{task.statusLabel}</span>
        <div>{edit(`${task.title} 제목`, `task.${task.id}.title`, task.title)}{edit(`${task.title} 설명`, `task.${task.id}.description`, task.description)}</div>
        {criterion ? <InlineConfirmation criterion={criterion} value={confirmations[criterion.id] ?? criterion.confirmedValue} onConfirm={props.onConfirm} /> : null}
      </header>
      <ul>
        <li>현재 상태: {task.statusLabel}</li>
        <li>{edit(`${task.title} 다음 할 일`, `task.${task.id}.nextAction`, `다음 할 일: ${task.nextAction}`)}</li>
        <li>{edit(`${task.title} 일정과 담당`, `task.${task.id}.meta`, `일정·담당: ${task.meta}`)}</li>
      </ul>
    </article>
  })

  const peopleRows = document.people.map((person) => [person.name, person.team, edit(`${person.name} 역할`, `person.${person.id}.responsibility`, person.responsibility)])
  const toolRows = document.tools.map((tool, index) => {
    const [name, purpose = ''] = tool.split(' — ')
    return [name, <EditableField key={name} seamless label={`자료 ${index + 1} 용도`} value={purpose} onChange={(next) => onFieldChange(`tool.${index}`, `${name} — ${next}`)} />]
  })

  return <article className={styles.editor}>
    <section className={styles.page}>
      <div className={styles.export}><ExportHandoverActions compact handover={handover} onFeedback={props.onFeedback} /></div>
      <header className={styles.hero}><p>모아스토어 / {handover.team}</p>{edit('문서 제목', 'title', document.title)}{edit('문서 소개', 'intro', document.intro)}</header>
      <dl className={styles.properties}>
        <div><dt>인계자</dt><dd>{handover.owner.name}</dd></div><div><dt>인수자</dt><dd><span className={styles.recipient}>{handover.recipient.name}</span></dd></div>
        <div><dt>담당 업무</dt><dd>{edit('담당 업무', 'scope', document.scope)}</dd></div><div><dt>참고 자료</dt><dd>업로드 파일 {handover.attachments.length}개</dd></div>
        <div><dt>상태</dt><dd>AI 초안 · 확인 중</dd></div><div><dt>업데이트</dt><dd>{document.updatedAtLabel}</dd></div>
      </dl>
      <section className={styles.section}><h2>업무 개요</h2><div className={styles.overview}><div><strong>업무 목적</strong>{edit('업무 목적', 'purpose', document.purpose)}</div><div><strong>인수인계 완료 기준</strong>{edit('완료 기준', 'completionStandard', document.completionStandard)}</div></div></section>
      <section className={styles.section}><h2>진행 중인 업무</h2><p>먼저 이어서 해야 할 일입니다.</p>{renderTasks(document.activeTasks)}</section>
      <section className={styles.section}><h2>반복 업무</h2><p>정해진 주기에 맞춰 진행합니다.</p>{renderTasks(document.recurringTasks)}</section>
      <section className={styles.section}><h2>업무 기준과 예외</h2><p>담당자가 바뀌어도 같은 판단을 내리기 위한 기준입니다.</p><ul className={styles.bullets}>{document.criteria.map((criterion) => <li key={criterion.id}>{edit(`${criterion.title} 내용`, `criterion.${criterion.id}`, criterion.defaultText)}</li>)}</ul></section>
      <section className={styles.section}><h2>주요 관계자</h2><p>업무별로 도움을 받을 사람입니다.</p><MockTable headers={['이름', '소속', '도움을 받을 내용']} rows={peopleRows} /></section>
      <section className={styles.section}><h2>사용 도구와 자료</h2><MockTable headers={['파일', '용도']} rows={toolRows} /></section>
      <section className={styles.section}><h2>업무 일정</h2><p>반복 시점과 완료 기준을 함께 확인합니다.</p><MockTable headers={['주기', '업무', '완료 기준']} rows={scheduleRows} /></section>
      <section className={styles.section}><h2>접근 권한과 계정</h2><p>업무 시작 전에 필요한 시스템 권한입니다.</p><MockTable headers={['도구', '필요 권한', '상태']} rows={accessRows} /></section>
      <section className={styles.section}><h2>첫 주 체크리스트</h2><ul className={styles.checklist}>{document.checklist.map((item, index) => <li key={`${item}-${index}`}><span>□</span>{edit(`체크리스트 ${index + 1}`, `checklist.${index}`, item)}</li>)}</ul></section>
    </section>
    <footer className={styles.actions}><button type="button" disabled={props.pending} onClick={props.onSubmit}>{props.returningFromComplete ? '수정 내용 저장하기' : '제출하기'} <Icon name="arrow" /></button></footer>
  </article>
}
