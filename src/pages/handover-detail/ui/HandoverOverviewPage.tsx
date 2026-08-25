import { useNavigate } from 'react-router-dom'

import { PersonSummary, TaskSummary } from '@/entities/handover'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { AppHeader } from '@/widgets/app-header'

import { useHandoverDetail } from '../model/useHandoverDetail'
import { DetailState } from './DetailState'
import styles from './HandoverEntryPages.module.css'

export function HandoverOverviewPage() {
  const navigate = useNavigate()
  const { error, handover, retry } = useHandoverDetail()
  if (!handover) return <><AppHeader /><DetailState error={error} onRetry={retry} /></>
  return <><AppHeader /><main className={styles.overview}><header><span className={styles.kicker}>업무 빠른 시작</span><h1>지금은 이 일부터 확인해요</h1><p>{handover.document.scope}</p></header><section><div className={styles.sectionTitle}><Icon name="target" /><h2>우선순위 업무</h2></div><div className={styles.taskGrid}>{handover.document.activeTasks.map((task) => <TaskSummary key={task.id} task={task} />)}</div></section><section><div className={styles.sectionTitle}><Icon name="check" /><h2>업무를 끊김 없이 잇는 기준</h2></div><div className={styles.continuity}>{handover.document.checklist.map((item, index) => <article key={item}><span>0{index + 1}</span><strong>{item}</strong></article>)}</div></section><section><div className={styles.sectionTitle}><Icon name="users" /><h2>함께 확인할 사람</h2></div><div className={styles.people}>{handover.document.people.map((person) => <PersonSummary key={person.id} person={person} />)}</div></section><aside className={styles.ai}><Icon name="spark" /><div><strong>문서에서 궁금한 내용을 AI에게 바로 물어보세요</strong><span>쿠폰 승인 순서나 배송업체 대응 기준도 자료 근거와 함께 답해드려요.</span></div><Button variant="secondary" onClick={() => navigate(`/handovers/${handover.id}/chat`)}>AI에게 질문</Button></aside><footer className={styles.actions}><Button variant="ghost" onClick={() => navigate(`/handovers/${handover.id}/arrival`)}>이전으로</Button><Button onClick={() => navigate(`/handovers/${handover.id}`)}>전체 문서 보기 <Icon name="arrow" /></Button></footer></main></>
}
