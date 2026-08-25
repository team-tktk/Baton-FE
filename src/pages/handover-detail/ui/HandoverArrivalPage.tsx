import { useNavigate } from 'react-router-dom'

import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { AppHeader } from '@/widgets/app-header'

import { useHandoverDetail } from '../model/useHandoverDetail'
import { DetailState } from './DetailState'
import styles from './HandoverEntryPages.module.css'

export function HandoverArrivalPage() {
  const navigate = useNavigate()
  const { error, handover, retry } = useHandoverDetail()
  if (!handover) return <><AppHeader /><DetailState error={error} onRetry={retry} /></>
  return <><AppHeader /><main className={styles.arrival}><span className={styles.kicker}>새 인수인계가 도착했어요</span><h1>{handover.owner.name}님의 업무를<br />이어받을 준비가 됐어요</h1><p>{handover.document.intro}</p><section className={styles.schedule}><div><Icon name="calendar" /></div><span>첫 번째 일정 · {handover.firstSchedule.dayLabel} {handover.firstSchedule.time}</span><h2>{handover.firstSchedule.title}</h2><p>{handover.firstSchedule.description}</p></section><div className={styles.actions}><Button variant="ghost" onClick={() => navigate('/handovers/received')}>목록으로</Button><Button onClick={() => navigate(`/handovers/${handover.id}/overview`)}>먼저 할 일 확인하기 <Icon name="arrow" /></Button></div></main></>
}
