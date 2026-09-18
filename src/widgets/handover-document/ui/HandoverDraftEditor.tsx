import type { ReactNode } from 'react'

import type { DocumentSection, Handover, HandoverTask, ReadinessArea } from '@/entities/handover'
import type { DraftIssue, DraftIssueMap } from '@/features/check-readiness'
import { containsAnchor, sectionElementId } from '@/features/check-readiness'
import { EditableField } from '@/features/edit-handover'
import { ExportHandoverActions } from '@/features/export-handover'
import { Icon } from '@/shared/ui/icon'

import styles from './HandoverDraftEditor.module.css'

interface HandoverDraftEditorProps {
  handover: Handover
  pending: boolean
  returningFromComplete: boolean
  /** 준비도 점검에서 부족하다고 본 섹션. 해당 섹션에 표시를 달고, 비어 있어도 자리를 그린다. */
  issues?: DraftIssueMap
  onFeedback: (message: string) => void
  onFieldChange: (field: string, value: string) => void
  onSubmit: () => void
  /** 비어 있는 섹션을 AI 보완으로 채운다. 없으면 버튼을 그리지 않는다. */
  onFillSection?: (area: ReadinessArea) => void
  /** 평가가 지금 문서와 맞지 않아 보완을 시작할 수 없다. */
  fillBlocked?: boolean
}

function MockTable({ headers, rows, highlighted = [] }: { headers: string[]; rows: ReactNode[][]; highlighted?: boolean[] }) {
  return <div className={styles.tableWrap}><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr data-highlighted={highlighted[rowIndex] || undefined} key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>
}

function IssueFlags({ issues }: { issues: DraftIssue[] | undefined }) {
  if (!issues?.length) return null
  return <div className={styles.flags}>{issues.map((issue) => (
    <span className={`${styles.flag} ${styles[issue.status]}`} key={issue.label}>
      <Icon name="alert" />준비도 · {issue.label} {issue.statusLabel}
      {issue.evidenceName && <small>근거: {issue.evidenceName}</small>}
    </span>
  ))}</div>
}

export function HandoverDraftEditor(props: HandoverDraftEditorProps) {
  const { handover, issues = {}, onFieldChange } = props
  const document = handover.document
  // prefix는 화면에만 붙이는 머리말이다. 저장할 때 떼어 내야 칸을 드나들기만 해도 내용이 바뀌지 않는다.
  const edit = (label: string, key: string, value: string, section?: DocumentSection, prefix = '') => (
    <EditableField
      highlighted={section ? containsAnchor(value, issues[section]) : false}
      seamless
      label={label}
      value={`${prefix}${value}`}
      onChange={(next) => onFieldChange(key, prefix && next.startsWith(prefix.trim()) ? next.slice(prefix.trim().length).trim() : next)}
    />
  )
  const rowHighlights = (section: DocumentSection, rows: string[][]) => rows.map((row) => containsAnchor(row.join(' '), issues[section]))

  // 내용이 있거나 준비도가 짚은 섹션만 그린다. 비어 있는데 짚였으면 채울 자리를 보여 준다.
  const section = (key: DocumentSection, title: string, description: string | null, hasContent: boolean, content: () => ReactNode) => {
    if (!hasContent && !issues[key]) return null
    return <section className={styles.section} data-issue={issues[key] ? true : undefined} id={sectionElementId(key)}>
      <h2>{title}</h2>
      <IssueFlags issues={issues[key]} />
      {description && <p>{description}</p>}
      {hasContent ? content() : <div className={styles.emptySlot}>
        <strong>비어 있어요</strong>
        {props.onFillSection
          ? <>{props.fillBlocked ? '문서가 평가 뒤에 바뀌었어요. 저장하고 다시 평가한 뒤 채울 수 있어요.' : '업로드한 자료에서 찾아 채우고, 없으면 몇 가지만 물어볼게요.'}
            <button disabled={props.fillBlocked} type="button" onClick={() => props.onFillSection?.(issues[key]![0]!.area)}><Icon name="spark" />AI로 채우기</button></>
          : '준비도 패널의 해결 방법을 참고해 채워 주세요.'}
      </div>}
    </section>
  }

  const renderTasks = (items: HandoverTask[], key: DocumentSection) => items.map((task) => (
    <article className={styles.task} key={task.id}>
      <header>
        <span className={`${styles.taskStatus} ${styles[task.tone]}`}>{task.statusLabel}</span>
        <div>{edit(`${task.title} 제목`, `task.${task.id}.title`, task.title, key)}{edit(`${task.title} 설명`, `task.${task.id}.description`, task.description, key)}</div>
      </header>
      <ul>
        <li>현재 상태: {task.statusLabel}</li>
        {task.nextAction && <li>{edit(`${task.title} 다음 할 일`, `task.${task.id}.nextAction`, task.nextAction, key, '다음 할 일: ')}</li>}
        {task.meta && <li>{edit(`${task.title} 일정과 담당`, `task.${task.id}.meta`, task.meta, key, '일정·담당: ')}</li>}
      </ul>
    </article>
  ))

  const peopleRows = document.people.map((person) => [person.name, person.team, edit(`${person.name} 역할`, `person.${person.id}.responsibility`, person.responsibility, 'STAKEHOLDERS')])
  const toolRows = document.tools.map((tool, index) => {
    const [name, purpose = ''] = tool.split(' — ')
    return [name, <EditableField highlighted={containsAnchor(tool, issues.TOOLS)} key={name} seamless label={`자료 ${index + 1} 용도`} value={purpose} onChange={(next) => onFieldChange(`tool.${index}`, `${name} — ${next}`)} />]
  })
  const scheduleRows = document.schedule.map((row) => [row.cycle, row.task, row.detail])
  const accessRows = document.accessAccounts.map((row) => [row.tool, row.permission, row.status])
  const confirmedRows = document.confirmedCriteria.map((row) => [row.label, row.value])

  return <article className={styles.editor}>
    <section className={styles.page}>
      <div className={styles.export}><ExportHandoverActions compact handover={handover} onFeedback={props.onFeedback} /></div>
      <header className={styles.hero}><p>{handover.team}</p>{edit('문서 제목', 'title', document.title)}{edit('문서 소개', 'intro', document.intro)}</header>
      <dl className={styles.properties}>
        <div><dt>인계자</dt><dd>{handover.owner.name}</dd></div><div><dt>인수자</dt><dd>{handover.recipients.map((person) => <span className={styles.recipient} key={person.id}>{person.name}</span>)}</dd></div>
        <div><dt>담당 업무</dt><dd>{edit('담당 업무', 'scope', document.scope)}</dd></div><div><dt>참고 자료</dt><dd>업로드 파일 {handover.attachments.length}개</dd></div>
        <div><dt>상태</dt><dd>AI 초안 · 확인 중</dd></div><div><dt>업데이트</dt><dd>{document.updatedAtLabel}</dd></div>
      </dl>
      <section className={styles.section}><h2>업무 개요</h2><div className={styles.overview}>
        <div data-issue={issues.PURPOSE ? true : undefined} id={sectionElementId('PURPOSE')}><strong>업무 목적</strong><IssueFlags issues={issues.PURPOSE} />{edit('업무 목적', 'purpose', document.purpose, 'PURPOSE')}</div>
        <div data-issue={issues.COMPLETION_CRITERIA ? true : undefined} id={sectionElementId('COMPLETION_CRITERIA')}><strong>인수인계 완료 기준</strong><IssueFlags issues={issues.COMPLETION_CRITERIA} />{edit('완료 기준', 'completionStandard', document.completionStandard, 'COMPLETION_CRITERIA')}</div>
      </div></section>
      {section('ONGOING_TASKS', '진행 중인 업무', '먼저 이어서 해야 할 일입니다.', document.activeTasks.length > 0, () => renderTasks(document.activeTasks, 'ONGOING_TASKS'))}
      {section('RECURRING_TASKS', '반복 업무', '정해진 주기에 맞춰 진행합니다.', document.recurringTasks.length > 0, () => renderTasks(document.recurringTasks, 'RECURRING_TASKS'))}
      {section('RULES_AND_EXCEPTIONS', '업무 기준과 예외', '담당자가 바뀌어도 같은 판단을 내리기 위한 기준입니다.', document.criteria.length > 0, () => (
        <ul className={styles.bullets}>{document.criteria.map((criterion) => <li key={criterion.id}>{edit(`${criterion.title} 내용`, `criterion.${criterion.id}`, criterion.defaultText, 'RULES_AND_EXCEPTIONS')}</li>)}</ul>
      ))}
      {section('STAKEHOLDERS', '주요 관계자', '업무별로 도움을 받을 사람입니다.', peopleRows.length > 0, () => (
        <MockTable headers={['이름', '소속', '도움을 받을 내용']} highlighted={rowHighlights('STAKEHOLDERS', document.people.map((person) => [person.name, person.team]))} rows={peopleRows} />
      ))}
      {section('TOOLS', '사용 도구와 자료', null, toolRows.length > 0, () => <MockTable headers={['파일', '용도']} rows={toolRows} />)}
      {section('SCHEDULE', '업무 일정', '반복 시점과 완료 기준을 함께 확인합니다.', scheduleRows.length > 0, () => (
        <MockTable headers={['주기', '업무', '완료 기준']} highlighted={rowHighlights('SCHEDULE', scheduleRows)} rows={scheduleRows} />
      ))}
      {section('ACCESS_ACCOUNTS', '접근 권한과 계정', '업무 시작 전에 필요한 시스템 권한입니다.', accessRows.length > 0, () => (
        <MockTable headers={['도구', '필요 권한', '상태']} highlighted={rowHighlights('ACCESS_ACCOUNTS', accessRows)} rows={accessRows} />
      ))}
      {section('FIRST_WEEK_CHECKLIST', '첫 주 체크리스트', null, document.checklist.length > 0, () => (
        <ul className={styles.checklist}>{document.checklist.map((item, index) => <li key={`${item}-${index}`}><span>□</span>{edit(`체크리스트 ${index + 1}`, `checklist.${index}`, item, 'FIRST_WEEK_CHECKLIST')}</li>)}</ul>
      ))}
      {section('CONFIRMED_CRITERIA', '확인된 업무 기준', '자료와 답변으로 확인한 판단 기준입니다.', confirmedRows.length > 0, () => (
        <MockTable headers={['기준', '내용']} highlighted={rowHighlights('CONFIRMED_CRITERIA', confirmedRows)} rows={confirmedRows} />
      ))}
    </section>
    <footer className={styles.actions}><button type="button" disabled={props.pending} onClick={props.onSubmit}>{props.returningFromComplete ? '수정 내용 저장하기' : '제출하기'} <Icon name="arrow" /></button></footer>
  </article>
}
