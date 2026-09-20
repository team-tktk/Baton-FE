import { type PropsWithChildren, type RefObject, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

import styles from './Modal.module.css'

interface ModalProps extends PropsWithChildren {
  open: boolean
  title: string
  onClose: () => void
  returnFocusRef?: RefObject<HTMLElement | null>
  /** wide는 내용을 나란히 비교하는 넓은 창이다. 화면보다 길면 창 안에서 스크롤한다. */
  size?: 'default' | 'wide'
  variant?: 'default' | 'guide'
}

export function Modal({ children, onClose, open, returnFocusRef, size = 'default', title, variant = 'default' }: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const restoreTarget = returnFocusRef?.current
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      setTimeout(() => restoreTarget?.focus(), 0)
    }
  }, [onClose, open, returnFocusRef])

  if (!open) return null

  return createPortal(
    <div className={styles.backdrop} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby={titleId} aria-modal="true" className={`${styles.modal} ${size === 'wide' ? styles.wide : ''} ${variant === 'guide' ? styles.guide : ''}`.trim()} role="dialog">
        <h2 id={titleId}>{title}</h2>
        {children}
      </section>
    </div>,
    document.body,
  )
}
