import { type PropsWithChildren, type RefObject, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

import styles from './Modal.module.css'

interface ModalProps extends PropsWithChildren {
  open: boolean
  title: string
  onClose: () => void
  returnFocusRef?: RefObject<HTMLElement | null>
}

export function Modal({ children, onClose, open, returnFocusRef, title }: ModalProps) {
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
      <section aria-labelledby={titleId} aria-modal="true" className={styles.modal} role="dialog">
        <h2 id={titleId}>{title}</h2>
        {children}
      </section>
    </div>,
    document.body,
  )
}
