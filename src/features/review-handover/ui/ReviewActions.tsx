import { useState } from 'react'

import type { Handover } from '@/entities/handover'
import { Icon } from '@/shared/ui/icon'

import styles from './ReviewActions.module.css'

interface ReviewActionsProps {
  handover: Handover
  pending: boolean
  onApprove: () => void | Promise<void>
  onToggleChecklist: (id: string, checked: boolean) => void
  onComment: (comment: string) => void | Promise<void>
  onRevision: () => void | Promise<void>
}

export function ReviewActions({ handover, pending, onApprove, onComment, onRevision, onToggleChecklist }: ReviewActionsProps) {
  const [comment, setComment] = useState('')
  const approved = handover.status === 'approved' || handover.status === 'completed'
  const submitComment = async () => {
    const value = comment.trim()
    if (!value || pending) return
    await onComment(value)
    setComment('')
  }
  return <aside className={styles.panel}>
    <header><small>책임자 검토</small><h2>문서를 확인해 주세요</h2><p>업무가 빠짐없이 전달됐는지 확인하고 의견을 남길 수 있습니다.</p></header>
    <section className={styles.checklist}>{handover.review.checklist.length === 0 && <p>아직 체크리스트가 없어요. 승인하려면 항목이 필요합니다.</p>}{handover.review.checklist.map((item) => <label key={item.id}><input checked={item.checked} disabled={pending} type="checkbox" onChange={(event) => onToggleChecklist(item.id, event.target.checked)} /><span>{item.label}</span></label>)}</section>
    <section className={styles.comments}>
      <h3>책임자 코멘트</h3>
      <div className={styles.commentList}>{handover.review.comments.length === 0 ? <p>아직 남긴 코멘트가 없습니다.</p> : handover.review.comments.map((item) => <article key={item.id}><strong>{item.authorName}</strong><p>{item.text}</p><span>{item.createdAtLabel}</span></article>)}</div>
      <label><span>검토 코멘트</span><textarea aria-label="검토 코멘트" placeholder="보완이 필요한 내용을 남겨주세요" value={comment} onChange={(event) => setComment(event.target.value)} /></label>
      <button className={styles.commentButton} disabled={pending || !comment.trim()} type="button" onClick={() => void submitComment()}>코멘트 남기기</button>
    </section>
    <footer><button disabled={pending} type="button" onClick={() => void onRevision()}>보완 요청</button><button className={styles.approveButton} disabled={pending || approved} type="button" onClick={() => void onApprove()}>{approved ? <><Icon name="check" /> 승인 완료</> : '인수인계 승인'}</button></footer>
  </aside>
}
