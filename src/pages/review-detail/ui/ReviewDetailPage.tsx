import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { Handover } from '@/entities/handover'
import { useHandoverRepository } from '@/entities/handover'
import { RepositoryError } from '@/shared/lib/async'
import { Badge } from '@/shared/ui/badge'
import { Icon } from '@/shared/ui/icon'
import { useToast } from '@/shared/ui/toast'
import { AppHeader } from '@/widgets/app-header'
import { ReviewWorkspace } from '@/widgets/review-workspace'

import styles from './ReviewDetailPage.module.css'

export function ReviewDetailPage() {
  const { handoverId } = useParams()
  const repository = useHandoverRepository()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [handover, setHandover] = useState<Handover | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)

  useEffect(() => {
    if (!handoverId) { navigate('/404', { replace: true }); return }
    let ignore = false
    repository.getHandover(handoverId).then((value) => { if (!ignore) setHandover(value) }).catch((reason: unknown) => {
      if (ignore) return
      if (reason instanceof RepositoryError && reason.code === 'NOT_FOUND') navigate('/404', { replace: true })
      else setError('검토 문서를 불러오지 못했어요.')
    })
    return () => { ignore = true }
  }, [handoverId, navigate, repository])

  const mutate = async (work: () => Promise<void>) => {
    if (pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    try { await work() } finally { pendingRef.current = false; setPending(false) }
  }

  if (!handover || !handoverId) return <><AppHeader /><main className={styles.state}>{error || '검토 문서를 불러오고 있어요…'}</main></>
  const approved = handover.status === 'approved'
  return <main className={styles.main}>
    <header>
      <button type="button" onClick={() => navigate('/reviews')}><Icon name="back" /> 검토 목록</button>
      <div><Badge tone={approved ? 'green' : 'yellow'}>{approved ? '승인 완료' : '승인 대기'}</Badge><strong>{handover.title}</strong><small>{handover.owner.name} → {handover.recipient.name} · {handover.deliveredAtLabel} 제출</small></div>
    </header>
    <ReviewWorkspace handover={handover} pending={pending} onAttachmentOpen={() => showToast('목업 파일이라 실제 다운로드는 제공하지 않아요')} onComment={(comment) => mutate(async () => { const created = await repository.addReviewComment(handoverId, comment); setHandover((current) => current ? { ...current, review: { ...current.review, comments: [...current.review.comments, created] } } : current); showToast('검토 코멘트를 남겼어요') })} onRevision={() => mutate(async () => { setHandover(await repository.requestRevision(handoverId)); showToast('보완을 요청했어요') })} onApprove={() => mutate(async () => { setHandover(await repository.approveHandover(handoverId)); showToast('인수인계를 승인했어요') })} />
  </main>
}
