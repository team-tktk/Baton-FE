import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import type { ReviewSummary } from '@/entities/handover'
import { useHandoverRepository } from '@/entities/handover'
import { Badge } from '@/shared/ui/badge'
import { Icon } from '@/shared/ui/icon'

import styles from './ReviewInboxPage.module.css'

type Filter = 'all' | 'pending' | 'revision' | 'approved'
const tabs: Array<{ count: number; filter: Exclude<Filter, 'all'>; label: string }> = [
  { filter: 'pending', label: '승인 대기', count: 2 },
  { filter: 'revision', label: '보완 요청', count: 1 },
  { filter: 'approved', label: '승인 완료', count: 4 },
]
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
  return <>
    <button className={styles.homeBack} type="button" onClick={() => navigate('/')}><Icon name="back" /> 홈으로</button>
    <main className={styles.main}>
      <header><div><span><Icon name="check" /> 인수인계 확인하기</span><h1>검토할 인수인계</h1><p>제출된 문서를 확인하고 승인하거나 보완 의견을 남기세요.</p></div><div className={styles.pendingCount}><strong>2</strong><span>승인 대기</span></div></header>
      {reviews ? <>
        <nav aria-label="검토 상태 필터">{tabs.map((tab) => <button aria-pressed={filter === 'all' ? tab.filter === 'pending' : filter === tab.filter} key={tab.filter} type="button" onClick={() => setParams({ status: tab.filter })}>{tab.label} {tab.count}</button>)}</nav>
        <section aria-label="검토할 인수인계 목록" className={styles.list}>{visible.map((review) => <article key={review.id}><button type="button" onClick={() => navigate(`/reviews/${review.id}`)}><Badge tone={review.tone}>{review.statusLabel}</Badge><span className={styles.copy}><strong>{review.title}</strong><small>{review.from} · {review.team}</small></span><span className={styles.meta}><small>업무 {review.tasks}개 · 첨부 {review.files}개</small><time>{review.date}</time></span><Icon name="chevron" /></button></article>)}</section>
      </> : <div className={styles.loading}>검토 목록을 불러오고 있어요…</div>}
    </main>
  </>
}
