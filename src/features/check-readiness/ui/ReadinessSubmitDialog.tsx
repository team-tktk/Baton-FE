import type { RefObject } from 'react'

import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'

import type { SubmitCheck } from '../model/submitCheck'
import styles from './ReadinessSubmitDialog.module.css'

interface ReadinessSubmitDialogProps {
  check: SubmitCheck | null
  /** 제출 후 다시 고치는 중이면 "저장" 문구를 쓴다. */
  saving: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
  onConfirm: () => void
}

export function ReadinessSubmitDialog({ check, onClose, onConfirm, returnFocusRef, saving }: ReadinessSubmitDialogProps) {
  return <Modal open={check !== null} returnFocusRef={returnFocusRef} title={check?.title ?? ''} onClose={onClose}>
    <ul className={styles.reasons}>{check?.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
    <p className={styles.note}>그래도 {saving ? '저장' : '전달'}할 수 있어요. 받는 사람이 보기 전에 한 번 더 보완하는 것을 권해요.</p>
    <div className={styles.actions}>
      <Button variant="ghost" onClick={onConfirm}>그래도 {saving ? '저장하기' : '제출하기'}</Button>
      <Button autoFocus onClick={onClose}>계속 보완하기</Button>
    </div>
  </Modal>
}
