import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import type { ReviewSummary } from '@/entities/handover'
import { HandoverStatusBadge, useHandoverRepository } from '@/entities/handover'
import { Icon } from '@/shared/ui/icon'
import { AppHeader } from '@/widgets/app-header'

import styles from './ReviewInboxPage.module.css'

type Filter = 'all' | 'pending' | 'revision' | 'approved'
const tabs: Array<{ filter: Filter; label: string }> = [{ filter: 'all', label: '전체' }, { filter: 'pending', label: '승인 대기' }, { filter: 'revision', label: '보완 요청' }, { filter: 'approved', label: '승인 완료' }]
const matches = (item: ReviewSummary, filter: Filter) => filter === 'all' || (filter === 'pending' ? item.status === 'submitted' : filter === 'revision' ? item.status === 'revision-requested' : item.status === 'approved')

export function ReviewInboxPage() {
  const repository = useHandoverRepository()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [reviews, setReviews] = useState<ReviewSummary[] | null>(null)
  const requested = params.get('status')
  const filter = tabs.some((tab) => tab.filter === requested) ? requested as Filter : 'all'
  useEffect(() => { let ignore = false; repository.listReviews().then((items) => { if (!ignore) setReviews(items) }); return () => { ignore = true } }, [repository])
  const visible = reviews?.filter((item) => matches(item, filter)) ?? []
  return <><AppHeader /><main className={styles.main}><header><span>팀장 검토</span><h1>인수인계 내용을 확인해 주세요</h1><p>빠진 업무와 다음 행동이 명확한지 확인하고 승인할 수 있어요.</p></header>{reviews ? <><nav>{tabs.map((tab) => <button aria-pressed={filter === tab.filter} key={tab.filter} type="button" onClick={() => setParams(tab.filter === 'all' ? {} : { status: tab.filter })}>{tab.label} {reviews.filter((item) => matches(item, tab.filter)).length}</button>)}</nav><div className={styles.list}>{visible.map((review) => <article key={review.id}><button type="button" onClick={() => navigate(`/reviews/${review.id}`)}><span className={styles.icon}><Icon name="briefcase" /></span><span className={styles.copy}><small>{review.team} · {review.date}</small><strong>{review.title}</strong><em>{review.from} · {review.tasks}개 업무 · {review.files}개 파일</em></span><HandoverStatusBadge label={review.statusLabel} status={review.status} /><Icon name="chevron" /></button></article>)}</div></> : <div className={styles.loading}>검토 목록을 불러오고 있어요…</div>}</main></>
}
