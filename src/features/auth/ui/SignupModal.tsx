import { type FormEvent, type RefObject, useState } from 'react'

import { ApiError } from '@/shared/api'
import { Modal } from '@/shared/ui/modal'

import { authApi } from '../api/authApi'
import styles from './AuthModal.module.css'

interface SignupModalProps {
  open: boolean
  onClose: () => void
  onLogin: () => void
  onSuccess: (email: string) => void
  returnFocusRef: RefObject<HTMLElement | null>
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SignupModal({ onClose, onLogin, onSuccess, open, returnFocusRef }: SignupModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [team, setTeam] = useState('')
  const [position, setPosition] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const input = {
      email: email.trim(),
      name: name.trim(),
      password,
      position: position.trim(),
      team: team.trim(),
    }
    if (!input.name || !input.email || !input.team || !input.position || !input.password) {
      setError('모든 항목을 입력해 주세요.')
      return
    }
    if (!EMAIL_PATTERN.test(input.email)) {
      setError('올바른 이메일 주소를 입력해 주세요.')
      return
    }
    if (password.length < 8 || password.length > 64) {
      setError('비밀번호는 8자 이상 64자 이하로 입력해 주세요.')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      await authApi.signup(input)
      onSuccess(input.email)
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 409
        ? '이미 가입된 이메일이에요.'
        : '회원가입에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setPassword('')
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} returnFocusRef={returnFocusRef} title="바톤을 시작해요" onClose={onClose}>
      <button aria-label="닫기" className={styles.close} disabled={submitting} type="button" onClick={onClose}>×</button>
      <span className={styles.eyebrow}>BATON</span>
      <p className={styles.description}>업무 인수인계를 한곳에서 관리해 보세요.</p>
      <form noValidate className={styles.form} onSubmit={submit}>
        <label>
          이름
          <input autoFocus required disabled={submitting} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          회사 이메일
          <input required disabled={submitting} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <div className={styles.row}>
          <label>
            팀
            <input required disabled={submitting} value={team} onChange={(event) => setTeam(event.target.value)} />
          </label>
          <label>
            직책
            <input required disabled={submitting} value={position} onChange={(event) => setPosition(event.target.value)} />
          </label>
        </div>
        <label>
          비밀번호
          <input required disabled={submitting} maxLength={64} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className={styles.submit} disabled={submitting} type="submit">{submitting ? '가입 중…' : '회원가입하기'}</button>
      </form>
      <div className={styles.switcher}>
        <span>이미 계정이 있나요?</span>
        <button type="button" onClick={onLogin}>로그인</button>
      </div>
    </Modal>
  )
}
