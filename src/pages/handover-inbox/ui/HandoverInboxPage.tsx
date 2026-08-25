import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { HandoverSummary } from '@/entities/handover'
import { useHandoverRepository } from '@/entities/handover'
import { AppHeader } from '@/widgets/app-header'
import { HandoverInbox } from '@/widgets/handover-inbox'

import styles from './HandoverInboxPage.module.css'

export function HandoverInboxPage() {
  const repository = useHandoverRepository()
  const navigate = useNavigate()
  const [handovers, setHandovers] = useState<HandoverSummary[] | null>(null)
  useEffect(() => { let ignore = false; repository.listReceivedHandovers().then((items) => { if (!ignore) setHandovers(items) }); return () => { ignore = true } }, [repository])
  return <><AppHeader /><main className={styles.main}><header><span>받은 인수인계</span><h1>이어서 맡을 업무를 확인해요</h1><p>중요한 순서부터 보고, 궁금한 내용은 AI에게 바로 물어볼 수 있어요.</p></header>{handovers ? <HandoverInbox handovers={handovers} onOpen={(handover) => navigate(`/handovers/${handover.id}/arrival`)} /> : <div className={styles.loading}>인수인계를 불러오고 있어요…</div>}</main></>
}
