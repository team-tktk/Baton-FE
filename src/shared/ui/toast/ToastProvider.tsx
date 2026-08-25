import { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react'

import styles from './Toast.module.css'
import { ToastContext } from './ToastContext'

export function ToastProvider({ children }: PropsWithChildren) {
  const [message, setMessage] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((nextMessage: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setMessage(nextMessage)
    timerRef.current = setTimeout(() => setMessage(''), 2_200)
  }, [])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return (
    <ToastContext value={{ showToast }}>
      {children}
      <div className={`${styles.toast} ${message ? styles.visible : ''}`} role="status">
        {message}
      </div>
    </ToastContext>
  )
}
