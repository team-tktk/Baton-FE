import { type FormEvent, type RefObject, useState } from 'react'

import { ApiError } from '@/shared/api'
import { Modal } from '@/shared/ui/modal'

import { useAuth } from '../model/useAuth'
import styles from './AuthModal.module.css'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  onSignup: () => void
  returnFocusRef: RefObject<HTMLElement | null>
}

export function AuthModal({ onClose, onSignup, open, returnFocusRef }: AuthModalProps) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)
    try {
      await login({ email: email.trim(), password })
      onClose()
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 401
        ? '이메일 또는 비밀번호를 확인해 주세요.'
        : '로그인에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setPassword('')
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} returnFocusRef={returnFocusRef} title="다시 만나서 반가워요" onClose={onClose}>
      <button aria-label="닫기" className={styles.close} disabled={submitting} type="button" onClick={onClose}>×</button>
      <span className={styles.eyebrow}>BATON</span>
      <p className={styles.description}>업무를 이어갈 준비가 되어 있어요.</p>
      <form className={styles.form} onSubmit={submit}>
        <label>
          회사 이메일
          <input autoFocus required disabled={submitting} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          비밀번호
          <input required disabled={submitting} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className={styles.submit} disabled={submitting} type="submit">{submitting ? '로그인 중…' : '로그인'}</button>
      </form>
      <div className={styles.switcher}>
        <span>처음이신가요?</span>
        <button type="button" onClick={onSignup}>회원가입</button>
      </div>
    </Modal>
  )
}
