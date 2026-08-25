import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { HandoverSummary } from '@/entities/handover'
import { useHandoverRepository } from '@/entities/handover'
import { Icon } from '@/shared/ui/icon'
import { HandoverInbox } from '@/widgets/handover-inbox'

import styles from './HandoverInboxPage.module.css'

export function HandoverInboxPage() {
  const repository = useHandoverRepository()
  const navigate = useNavigate()
  const [handovers, setHandovers] = useState<HandoverSummary[] | null>(null)
  useEffect(() => { let ignore = false; repository.listReceivedHandovers().then((items) => { if (!ignore) setHandovers(items) }); return () => { ignore = true } }, [repository])
  return <><button className={styles.homeBack} type="button" onClick={() => navigate('/')}><Icon name="back" /> 홈으로</button><main className={styles.main}><header><span><Icon name="briefcase" /> 인수인계 받기</span><h1>받은 인수인계</h1><p>보낸 사람별로 묶인 인수인계를 확인하고 업무를 이어서 진행하세요.</p></header>{handovers ? <HandoverInbox handovers={handovers} onOpen={(handover) => navigate(`/handovers/${handover.id}`)} /> : <div className={styles.loading}>인수인계를 불러오고 있어요…</div>}</main></>
}
