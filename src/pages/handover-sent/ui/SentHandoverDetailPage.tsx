import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { HandoverAttachment, ReviewComment } from '@/entities/handover'
import { HandoverStatusBadge, useHandoverRepository } from '@/entities/handover'
import { ApiError } from '@/shared/api'
import { saveBlob } from '@/shared/lib/download'
import { Icon } from '@/shared/ui/icon'
import { useToast } from '@/shared/ui/toast'
import { ReviewWorkspace } from '@/widgets/review-workspace'

import { useHandoverDetail } from '../../handover-detail/model/useHandoverDetail'
import styles from './SentHandoverDetailPage.module.css'

export function SentHandoverDetailPage() {
  const navigate = useNavigate()
  const repository = useHandoverRepository()
  const { showToast } = useToast()
  const { error, handover, handoverId, retry } = useHandoverDetail()
  const [comments, setComments] = useState<ReviewComment[] | null>(null)

  // 코멘트는 참여자 모두 접근 가능한 전용 API로 불러온다(책임자 검토 응답과 별개).
  useEffect(() => {
    if (!handoverId) return
    let ignore = false
    repository.listComments(handoverId)
      .then((items) => { if (!ignore) setComments(items) })
      .catch(() => { if (!ignore) setComments([]) })
    return () => { ignore = true }
  }, [handoverId, repository])

  const downloadAttachment = (attachment: HandoverAttachment) => {
    if (!handoverId) return
    void (async () => {
      try {
        const { blob, filename } = await repository.downloadFile(handoverId, attachment.id)
        saveBlob(blob, filename || attachment.name)
      } catch (caught) {
        showToast(caught instanceof ApiError ? caught.message : '파일을 내려받지 못했어요')
      }
    })()
  }

  if (!handover) return <main className={styles.state}>{error ? <div><p>{error}</p><button type="button" onClick={retry}>다시 시도</button></div> : '인수인계를 불러오고 있어요…'}</main>

  const view = comments ? { ...handover, review: { ...handover.review, comments } } : handover
  return <main className={styles.main}>
    <header>
      <button type="button" onClick={() => navigate('/handovers/sent')}><Icon name="back" /> 내 인수인계</button>
      <div>
        <HandoverStatusBadge status={handover.status} />
        <strong>{handover.title}</strong>
        <small>{handover.owner.name} → {handover.recipients.map((person) => person.name).join(', ') || '인수자'} · {handover.deliveredAtLabel} 제출</small>
      </div>
    </header>
    <ReviewWorkspace readOnly handover={view} onAttachmentOpen={downloadAttachment} />
  </main>
}
