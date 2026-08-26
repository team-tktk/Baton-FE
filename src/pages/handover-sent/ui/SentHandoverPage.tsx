import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { SentSummary } from '@/entities/handover'
import { HandoverStatusBadge, useHandoverRepository } from '@/entities/handover'
import { Icon } from '@/shared/ui/icon'

import styles from './SentHandoverPage.module.css'

export function SentHandoverPage() {
  const repository = useHandoverRepository()
  const navigate = useNavigate()
  const [handovers, setHandovers] = useState<SentSummary[] | null>(null)

  useEffect(() => {
    let ignore = false
    repository.listSentHandovers().then((items) => { if (!ignore) setHandovers(items) })
    return () => { ignore = true }
  }, [repository])

  return <>
    <button className={styles.homeBack} type="button" onClick={() => navigate('/')}><Icon name="back" /> 홈으로</button>
    <main className={styles.main}>
      <header>
        <div><span><Icon name="briefcase" /> 내 인수인계</span><h1>내가 만든 인수인계</h1><p>내가 인계자로 만든 인수인계와 책임자 코멘트를 확인하세요.</p></div>
        <div className={styles.total}><strong>{handovers?.length ?? 0}</strong><span>전체</span></div>
      </header>
      {handovers ? (
        handovers.length > 0
          ? <section aria-label="내가 만든 인수인계 목록" className={styles.list}>{handovers.map((item) => (
              <article key={item.id}>
                <button type="button" onClick={() => navigate(`/handovers/sent/${item.id}`)}>
                  <HandoverStatusBadge status={item.status} />
                  <span className={styles.copy}><strong>{item.scope}</strong><small>받는 사람 {item.recipients}명</small></span>
                  <span className={styles.meta}><small>업무 {item.tasks}개 · 첨부 {item.files}개</small><time>{item.date}</time></span>
                  <Icon name="chevron" />
                </button>
              </article>
            ))}</section>
          : <div className={styles.empty}>아직 만든 인수인계가 없어요. 홈에서 ‘인수인계 하기’로 시작해 보세요.</div>
      ) : <div className={styles.loading}>인수인계를 불러오고 있어요…</div>}
    </main>
  </>
}
