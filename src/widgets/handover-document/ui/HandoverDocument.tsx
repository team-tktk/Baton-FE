import type { Handover, HandoverTask } from '@/entities/handover'
import { EditableField, type EditableDocumentField } from '@/features/edit-handover'
import { Badge } from '@/shared/ui/badge'
import { Icon } from '@/shared/ui/icon'

import styles from './HandoverDocument.module.css'

interface HandoverDocumentProps {
  handover: Handover
  mode: 'read' | 'edit' | 'review'
  onFieldChange?: (field: string, value: string) => void
  activeCriterionId?: string | null
  onCriterionOpen?: (criterionId: string) => void
}

const fieldLabels: Record<EditableDocumentField, string> = {
  title: '문서 제목',
  intro: '문서 소개',
  scope: '인계 범위',
  purpose: '업무 목적',
  completionStandard: '완료 기준',
}

function TaskCard({ task, onCriterionOpen }: { task: HandoverTask; onCriterionOpen?: (criterionId: string) => void }) {
  return <article className={styles.task}>
    <header><h3>{task.title}</h3><Badge tone={task.tone}>{task.statusLabel}</Badge></header>
    <p>{task.description}</p>
    <dl><div><dt>다음 할 일</dt><dd>{task.nextAction}</dd></div><div><dt>일정 · 담당</dt><dd>{task.meta}</dd></div></dl>
    {task.criterionId && onCriterionOpen && <button type="button" onClick={() => onCriterionOpen(task.criterionId!)}>판단 기준 확인 <Icon name="chevron" /></button>}
  </article>
}

export function HandoverDocument({ handover, mode, onFieldChange, onCriterionOpen }: HandoverDocumentProps) {
  const document = handover.document
  const field = (name: EditableDocumentField, value: string) => mode === 'edit' && onFieldChange
    ? <EditableField label={fieldLabels[name]} value={value} onChange={(nextValue) => onFieldChange(name, nextValue)} />
    : <p>{value}</p>

  return (
    <article className={styles.document}>
      <header className={styles.hero}>
        <div><span>{handover.team} · {handover.owner.name} → {handover.recipient.name}</span><h1>{document.title}</h1><p>{document.intro}</p></div>
        <Badge tone="blue">{document.statusLabel}</Badge>
      </header>
      <section className={styles.summary}><div><h2>인계 범위</h2>{field('scope', document.scope)}</div><div><h2>업무 목적</h2>{field('purpose', document.purpose)}</div><div><h2>완료 기준</h2>{field('completionStandard', document.completionStandard)}</div></section>
      <section><div className={styles.sectionTitle}><Icon name="briefcase" /><h2>진행 중인 업무</h2></div><div className={styles.tasks}>{document.activeTasks.map((task) => <TaskCard key={task.id} task={task} onCriterionOpen={onCriterionOpen} />)}</div></section>
      <section><div className={styles.sectionTitle}><Icon name="repeat" /><h2>반복 업무</h2></div><div className={styles.tasks}>{document.recurringTasks.map((task) => <TaskCard key={task.id} task={task} onCriterionOpen={onCriterionOpen} />)}</div></section>
      <section><div className={styles.sectionTitle}><Icon name="shield" /><h2>확인된 업무 기준</h2></div><div className={styles.criteria}>{document.criteria.map((criterion) => <button key={criterion.id} type="button" onClick={() => onCriterionOpen?.(criterion.id)}><strong>{criterion.title}</strong><span>{criterion.confirmedValue ?? criterion.defaultText}</span></button>)}</div></section>
      <section className={styles.columns}><div><div className={styles.sectionTitle}><Icon name="users" /><h2>함께 일하는 사람</h2></div><ul>{document.people.map((person) => <li key={person.id}><strong>{person.name} · {person.team}</strong><span>{person.responsibility}</span></li>)}</ul></div><div><div className={styles.sectionTitle}><Icon name="file" /><h2>첨부 자료</h2></div><ul>{handover.attachments.map((attachment) => <li key={attachment.id}>{attachment.name}</li>)}</ul></div></section>
      <section><div className={styles.sectionTitle}><Icon name="check" /><h2>첫날 체크리스트</h2></div><ul className={styles.checklist}>{document.checklist.map((item) => <li key={item}><span />{item}</li>)}</ul></section>
    </article>
  )
}
