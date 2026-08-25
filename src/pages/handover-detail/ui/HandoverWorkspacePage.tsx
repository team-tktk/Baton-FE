import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/features/auth'
import { Badge } from '@/shared/ui/badge'
import { Icon } from '@/shared/ui/icon'
import { useToast } from '@/shared/ui/toast'
import { AppHeader } from '@/widgets/app-header'
import { HandoverReadDocument } from '@/widgets/handover-document'

import { useHandoverDetail } from '../model/useHandoverDetail'
import { DetailState } from './DetailState'
import { HandoverAiPanel } from './HandoverAiPanel'
import styles from './HandoverWorkspacePages.module.css'

export function HandoverWorkspacePage() {
  const navigate = useNavigate()
  const { isDemo } = useAuth()
  const [aiOpen, setAiOpen] = useState(false)
  const { showToast } = useToast()
  const { error, handover, retry } = useHandoverDetail()
  if (!handover) return <><AppHeader /><DetailState error={error} onRetry={retry} /></>
  const attachmentNotice = () => showToast('첨부 문서를 확인했어요')
  const completeReceipt = () => {
    showToast('정하늘님이 인수인계 내용을 확인했어요')
    navigate('/')
  }
  return <main className={styles.workspace}>
    <header className={styles.workspaceHeader}>
      <button type="button" onClick={() => navigate('/handovers/received')}><Icon name="back" /> 받은 인수인계</button>
      <div className={styles.workspaceTitle}><small>{handover.team} · {handover.deliveredAtLabel} 전달</small><strong>{handover.owner.name}님에게 받은 인수인계</strong></div>
      <div className={styles.workspaceTools}><Badge tone="blue">확인 전</Badge><button type="button" onClick={() => setAiOpen(true)}><Icon name="chat" /> AI에게 질문</button>{isDemo && <button className={styles.completeReceipt} type="button" onClick={completeReceipt}><Icon name="check" /> 내용 확인 완료</button>}</div>
    </header>
    <div className={styles.workspaceDocument}><HandoverReadDocument handover={handover} onAttachmentOpen={attachmentNotice} /></div>
    <HandoverAiPanel attachmentCount={handover.attachments.length} handoverId={handover.id} open={aiOpen} onClose={() => setAiOpen(false)} />
  </main>
}
