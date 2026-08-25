import { useSearchParams } from 'react-router-dom'

import type { HandoverSummary, HandoverStatus } from '@/entities/handover'
import { HandoverStatusBadge } from '@/entities/handover'
import { Icon } from '@/shared/ui/icon'

import styles from './HandoverInbox.module.css'

type Filter = 'all' | 'unread' | 'in-progress' | 'completed'
const tabs: Array<{ filter: Filter; label: string }> = [{ filter: 'all', label: '전체' }, { filter: 'unread', label: '확인 전' }, { filter: 'in-progress', label: '진행 중' }, { filter: 'completed', label: '완료' }]
const matches = (status: HandoverStatus, filter: Filter) => filter === 'all' || (filter === 'unread' ? status === 'submitted' : status === filter)

export function HandoverInbox({ handovers, onOpen }: { handovers: HandoverSummary[]; onOpen: (handover: HandoverSummary) => void }) {
  const [params, setParams] = useSearchParams()
  const requested = params.get('status')
  const filter: Filter = tabs.some((tab) => tab.filter === requested) ? requested as Filter : 'all'
  const visible = handovers.filter((handover) => matches(handover.status, filter))
  return <>
    <nav aria-label="인수인계 필터" className={styles.tabs}>{tabs.map((tab) => <button aria-pressed={filter === tab.filter} key={tab.filter} type="button" onClick={() => setParams(tab.filter === 'all' ? {} : { status: tab.filter })}>{tab.label} {handovers.filter((item) => matches(item.status, tab.filter)).length}</button>)}</nav>
    <section aria-label="받은 인수인계 목록" className={styles.list}>{visible.map((handover) => <article key={handover.id}><button type="button" onClick={() => onOpen(handover)}><span className={styles.status}><HandoverStatusBadge label={handover.statusLabel} status={handover.status} /></span><span className={styles.copy}><strong>{handover.person}님에게 받은 인수인계</strong><small>{handover.team} · {handover.scope}</small></span><span className={styles.meta}><small>업무 {handover.tasks}개 · 첨부 {handover.files}개</small><time>{handover.date}</time></span><Icon name="chevron" /></button></article>)}</section>
    {visible.length === 0 && <div className={styles.empty}><Icon name="briefcase" /><strong>해당 상태의 인수인계가 없어요</strong><span>다른 필터를 선택해 보세요.</span></div>}
  </>
}
