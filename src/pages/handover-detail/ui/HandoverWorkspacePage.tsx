import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { HandoverStatus } from '@/entities/handover'
import { useHandoverRepository } from '@/entities/handover'
import { ApiError } from '@/shared/api'
import { Badge } from '@/shared/ui/badge'
import { Icon } from '@/shared/ui/icon'
import { useToast } from '@/shared/ui/toast'
import { AppHeader } from '@/widgets/app-header'
import { HandoverReadDocument } from '@/widgets/handover-document'

import { useHandoverDetail } from '../model/useHandoverDetail'
import { DetailState } from './DetailState'
import { HandoverAiPanel } from './HandoverAiPanel'
import styles from './HandoverWorkspacePages.module.css'

const STATUS_BADGE: Record<HandoverStatus, { label: string; tone: 'neutral' | 'blue' | 'yellow' | 'green' }> = {
  completed: { label: '확인 완료', tone: 'green' },
  approved: { label: '승인 완료 · 완료 처리 가능', tone: 'green' },
  'in-progress': { label: '진행 중', tone: 'yellow' },
  'revision-requested': { label: '보완 요청', tone: 'yellow' },
  draft: { label: '작성 중', tone: 'neutral' },
  submitted: { label: '확인 전', tone: 'blue' },
}

export function HandoverWorkspacePage() {
  const navigate = useNavigate()
  const repository = useHandoverRepository()
  const [aiOpen, setAiOpen] = useState(false)
  const [completing, setCompleting] = useState(false)
  const { showToast } = useToast()
  const { error, handover, handoverId, retry } = useHandoverDetail()
  const acknowledged = useRef<string | null>(null)
  const aiTriggerRef = useRef<HTMLButtonElement>(null)

  // 인수자가 문서를 처음 열었을 때 한 번만 수신 확인을 보낸다. 서버는 멱등이다.
  useEffect(() => {
    if (!handoverId || acknowledged.current === handoverId) return
    acknowledged.current = handoverId
    repository.acknowledgeHandover(handoverId).catch(() => { /* 수신 확인 실패가 열람을 막지는 않는다 */ })
  }, [handoverId, repository])

  if (!handover) return <><AppHeader /><DetailState error={error} onRetry={retry} /></>

  const badge = STATUS_BADGE[handover.status] ?? STATUS_BADGE.submitted
  const complete = async () => {
    if (!handoverId || completing) return
    setCompleting(true)
    try {
      await repository.completeHandover(handoverId)
      showToast('인수인계를 완료 처리했어요')
      retry()
    } catch (caught) {
      showToast(caught instanceof ApiError ? caught.message : '완료 처리를 하지 못했어요. 잠시 후 다시 시도해 주세요')
    } finally { setCompleting(false) }
  }

  return <main className={styles.workspace}>
    <header className={styles.workspaceHeader}>
      <button type="button" onClick={() => navigate('/handovers/received')}><Icon name="back" /> 받은 인수인계</button>
      <div className={styles.workspaceTitle}><small>{handover.team} · {handover.deliveredAtLabel} 전달</small><strong>{handover.owner.name}님에게 받은 인수인계</strong></div>
      <div className={styles.workspaceTools}>
        <Badge tone={badge.tone}>{badge.label}</Badge>
        {handover.status === 'approved' && (
          <button disabled={completing} type="button" onClick={() => void complete()}>
            <Icon name="check" /> {completing ? '처리 중…' : '인수인계 완료'}
          </button>
        )}
        <button ref={aiTriggerRef} type="button" onClick={() => setAiOpen(true)}><Icon name="chat" /> AI에게 질문</button>
      </div>
    </header>
    <div className={styles.workspaceDocument}><HandoverReadDocument handover={handover} onAttachmentOpen={() => showToast('파일 다운로드는 아직 준비 중이에요')} /></div>
    <HandoverAiPanel attachmentCount={handover.attachments.length} handoverId={handover.id} open={aiOpen} returnFocusRef={aiTriggerRef} onClose={() => setAiOpen(false)} />
  </main>
}
