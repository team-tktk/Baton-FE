import { useSearchParams } from 'react-router-dom'

import type { HandoverSummary, HandoverStatus } from '@/entities/handover'
import { HandoverStatusBadge } from '@/entities/handover'
import { Icon } from '@/shared/ui/icon'

import styles from './HandoverInbox.module.css'

type Filter = 'all' | 'unread' | 'in-progress' | 'approved'
const tabs: Array<{ filter: Filter; label: string }> = [{ filter: 'all', label: '전체' }, { filter: 'unread', label: '확인 전' }, { filter: 'in-progress', label: '진행 중' }, { filter: 'approved', label: '확인 완료' }]
const matches = (status: HandoverStatus, filter: Filter) => filter === 'all' || (filter === 'unread' ? status === 'submitted' : status === filter)

export function HandoverInbox({ handovers, onOpen }: { handovers: HandoverSummary[]; onOpen: (handover: HandoverSummary) => void }) {
  const [params, setParams] = useSearchParams()
  const requested = params.get('status')
  const filter: Filter = tabs.some((tab) => tab.filter === requested) ? requested as Filter : 'all'
  const visible = handovers.filter((handover) => matches(handover.status, filter))
  return <>
    <nav aria-label="받은 인수인계 필터" className={styles.tabs}>{tabs.map((tab) => <button aria-pressed={filter === tab.filter} key={tab.filter} type="button" onClick={() => setParams(tab.filter === 'all' ? {} : { status: tab.filter })}>{tab.label} <span>{handovers.filter((item) => matches(item.status, tab.filter)).length}</span></button>)}</nav>
    <div className={styles.list}>{visible.map((handover) => <article key={handover.id}><button aria-label={`${handover.person}님의 인수인계 열기`} type="button" onClick={() => onOpen(handover)}><i>{handover.person.slice(0, 1)}</i><span className={styles.copy}><small>{handover.team} · {handover.date}</small><strong>{handover.person}님이 보낸 인수인계</strong><em>{handover.scope}</em><span>{handover.tasks}개 업무 · {handover.files}개 파일</span></span><HandoverStatusBadge label={handover.statusLabel} status={handover.status} /><Icon name="chevron" /></button></article>)}</div>
    {visible.length === 0 && <div className={styles.empty}><Icon name="briefcase" /><strong>해당 상태의 인수인계가 없어요</strong><span>다른 필터를 선택해 보세요.</span></div>}
  </>
}
