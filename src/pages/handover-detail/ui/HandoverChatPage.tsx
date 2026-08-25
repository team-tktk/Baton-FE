import { useNavigate } from 'react-router-dom'

import { Icon } from '@/shared/ui/icon'
import { AppHeader } from '@/widgets/app-header'
import { HandoverChat } from '@/widgets/handover-chat'

import { useHandoverDetail } from '../model/useHandoverDetail'
import { DetailState } from './DetailState'
import styles from './HandoverWorkspacePages.module.css'

export function HandoverChatPage() {
  const navigate = useNavigate()
  const { error, handover, retry } = useHandoverDetail()
  if (!handover) return <><AppHeader /><DetailState error={error} onRetry={retry} /></>
  return <><AppHeader /><main className={styles.chatPage}><button type="button" onClick={() => navigate(`/handovers/${handover.id}`)}><Icon name="back" /> 인수인계 문서로</button><header><span>AI 업무 도우미</span><h1>{handover.document.scope}에 대해 물어보세요</h1></header><HandoverChat key={handover.id} handoverId={handover.id} /></main></>
}
