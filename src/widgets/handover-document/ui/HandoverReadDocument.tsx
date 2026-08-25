import type { Handover, HandoverAttachment, HandoverTask } from '@/entities/handover'
import { Badge } from '@/shared/ui/badge'
import { Icon } from '@/shared/ui/icon'

import styles from './HandoverReadDocument.module.css'

const taskDescriptions: Record<string, string> = {
  'task-autumn-campaign': '상품팀·마케팅팀과 쿠폰 범위를 확정하고 9월 12일 행사 설정을 마무리합니다.',
  'task-delivery-vendor': '물류팀 답변을 받은 뒤 배송업체 신청 화면에 조건을 등록합니다.',
  'task-weekly-orders': '월요일에 주문과 반품을 확인하고 화요일에 팀에 공유합니다.',
}

const criterionDescriptions: Record<string, string> = {
  coupon: '쿠폰 할인율이 10%를 넘으면 팀장 승인 순서를 확인합니다.',
  delivery: '배송업체 답변이 늦으면 다음 날 오전에 물류팀에 공유합니다.',
  report: '품절 가능 재고가 10개 미만이면 상품 노출을 조정합니다.',
}

function attachmentMeta(attachment: HandoverAttachment) {
  const extension = attachment.name.split('.').pop()?.toUpperCase() ?? 'FILE'
  const size = attachment.size >= 1_000_000 ? `${(attachment.size / 1_000_000).toFixed(1)}MB` : `${Math.round(attachment.size / 1_000)}KB`
  return `${extension} · ${size}`
}

function TaskRow({ task }: { task: HandoverTask }) {
  return <div className={styles.taskRow}><Badge tone={task.tone}>{task.statusLabel}</Badge><strong>{task.title}</strong><p>{taskDescriptions[task.id] ?? task.description}</p></div>
}

export function HandoverReadDocument({ handover, onAttachmentOpen }: { handover: Handover; onAttachmentOpen: (attachment: HandoverAttachment) => void }) {
  const document = handover.document
  const tasks = [...document.activeTasks, ...document.recurringTasks]
  return <>
    <article className={styles.document}>
      <header><p>모아스토어 · {handover.team}</p><h1>{document.title}</h1><span>{document.intro}</span></header>
      <dl className={styles.meta}><div><dt>인계자</dt><dd>{handover.owner.name}</dd></div><div><dt>인수자</dt><dd>{handover.recipient.name}</dd></div><div><dt>담당 업무</dt><dd>{document.scope}</dd></div><div><dt>업데이트</dt><dd>{document.updatedAtLabel}</dd></div></dl>
      <section><h2>업무 개요</h2><p>{document.purpose}</p></section>
      <section><h2>먼저 이어서 할 일</h2><div className={styles.taskTable}>{tasks.map((task) => <TaskRow key={task.id} task={task} />)}</div></section>
      <section><h2>업무 기준과 예외</h2><ul>{document.criteria.map((criterion) => <li key={criterion.id}>{criterionDescriptions[criterion.id] ?? criterion.defaultText}</li>)}</ul></section>
      <section><h2>주요 관계자</h2><div className={styles.tableFrame}><table><thead><tr><th>이름</th><th>소속</th><th>도움을 받을 내용</th></tr></thead><tbody>{document.people.map((person) => <tr key={person.id}><td>{person.name}</td><td>{person.team}</td><td>{person.responsibility}</td></tr>)}</tbody></table></div></section>
    </article>
    <section className={styles.attachments}>
      <header><div><h2>첨부 문서</h2><p>AI 답변에 함께 사용되는 원본 자료입니다.</p></div><span>{handover.attachments.length}개</span></header>
      {handover.attachments.map((attachment) => <button key={attachment.id} type="button" onClick={() => onAttachmentOpen(attachment)}><span className={styles.attachmentIcon}><Icon name="file" /></span><span><strong>{attachment.name}</strong><small>{attachmentMeta(attachment)}</small></span></button>)}
    </section>
  </>
}
