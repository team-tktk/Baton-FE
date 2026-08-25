import { useState } from 'react'

import type { Handover } from '@/entities/handover'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'

import styles from './ReviewActions.module.css'

interface ReviewActionsProps {
  handover: Handover
  pending: boolean
  onApprove: () => void | Promise<void>
  onComment: (comment: string) => void | Promise<void>
  onRevision: () => void | Promise<void>
}

export function ReviewActions({ handover, pending, onApprove, onComment, onRevision }: ReviewActionsProps) {
  const [comment, setComment] = useState('')
  const submitComment = async () => {
    const value = comment.trim()
    if (!value || pending) return
    await onComment(value)
    setComment('')
  }
  return <aside className={styles.panel}>
    <header><Icon name="shield" /><div><strong>팀장 검토</strong><span>{handover.review.checklist.filter((item) => item.checked).length}/{handover.review.checklist.length} 항목 확인</span></div></header>
    <ul className={styles.checklist}>{handover.review.checklist.map((item) => <li key={item.id}><span className={item.checked ? styles.checked : ''}>{item.checked && <Icon name="check" />}</span>{item.label}</li>)}</ul>
    <section className={styles.comments}><h3>검토 코멘트</h3>{handover.review.comments.length === 0 ? <p>아직 남긴 코멘트가 없어요.</p> : handover.review.comments.map((item) => <article key={item.id}><strong>{item.authorName}</strong><p>{item.text}</p><span>{item.createdAtLabel}</span></article>)}<label>검토 코멘트<textarea value={comment} onChange={(event) => setComment(event.target.value)} /></label><Button disabled={pending || !comment.trim()} variant="secondary" onClick={() => void submitComment()}>코멘트 남기기</Button></section>
    <div className={styles.actions}><Button disabled={pending} variant="secondary" onClick={() => void onRevision()}>보완 요청</Button><Button disabled={pending} onClick={() => void onApprove()}>승인하기</Button></div>
  </aside>
}
