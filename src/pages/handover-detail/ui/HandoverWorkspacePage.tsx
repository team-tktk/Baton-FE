import { useNavigate } from 'react-router-dom'

import { AttachmentList } from '@/entities/handover'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { useToast } from '@/shared/ui/toast'
import { AppHeader } from '@/widgets/app-header'
import { HandoverChat } from '@/widgets/handover-chat'
import { HandoverDocument } from '@/widgets/handover-document'

import { useHandoverDetail } from '../model/useHandoverDetail'
import { DetailState } from './DetailState'
import styles from './HandoverWorkspacePages.module.css'

export function HandoverWorkspacePage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { error, handover, retry } = useHandoverDetail()
  if (!handover) return <><AppHeader /><DetailState error={error} onRetry={retry} /></>
  const fixtureNotice = () => showToast('목업 파일이라 실제 다운로드는 제공하지 않아요')
  return <><AppHeader><Button variant="secondary" onClick={() => navigate(`/handovers/${handover.id}/chat`)}><Icon name="chat" /> AI에게 질문</Button></AppHeader><main className={styles.workspace}><header><button type="button" onClick={() => navigate(`/handovers/${handover.id}/overview`)}><Icon name="back" /> 빠른 시작으로</button><span>{handover.owner.name}님이 전달한 업무 · {handover.deliveredAtLabel}</span></header><div className={styles.layout}><div><HandoverDocument handover={handover} mode="read" /><section className={styles.attachments}><h2><Icon name="file" /> 첨부 자료</h2><AttachmentList attachments={handover.attachments} onOpen={fixtureNotice} /></section></div><aside><HandoverChat handoverId={handover.id} /></aside></div></main></>
}
