import { type FormEvent, type RefObject, useState } from 'react'

import { Modal } from '@/shared/ui/modal'

import { useDemoAuth } from '../model/useDemoAuth'
import styles from './DemoAuthModal.module.css'

export type AuthMode = 'login' | 'signup'

interface DemoAuthModalProps {
  mode: AuthMode | null
  onClose: () => void
  onModeChange: (mode: AuthMode) => void
  returnFocusRef: RefObject<HTMLElement | null>
}

export function DemoAuthModal({ mode, onClose, onModeChange, returnFocusRef }: DemoAuthModalProps) {
  const { login, signup, user } = useDemoAuth()
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [team, setTeam] = useState(`${user.organization} · ${user.team}`)
  const signupMode = mode === 'signup'

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (signupMode) {
      const [organization = '모아스토어', teamName = '운영팀'] = team.split('·').map((value) => value.trim())
      signup({ name, email, organization, team: teamName })
    } else {
      login(email)
    }
    onClose()
  }

  return (
    <Modal
      open={mode !== null}
      returnFocusRef={returnFocusRef}
      title={signupMode ? '바톤터치를 시작해요' : '다시 만나서 반가워요'}
      onClose={onClose}
    >
      <button aria-label="닫기" className={styles.close} type="button" onClick={onClose}>×</button>
      <span className={styles.eyebrow}>BATON</span>
      <p className={styles.description}>
        {signupMode ? '업무 인수인계를 한곳에서 관리해 보세요.' : '업무를 이어갈 준비가 되어 있어요.'}
      </p>
      <form className={styles.form} onSubmit={submit}>
        {signupMode && (
          <>
            <label>이름<input autoFocus required value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label>소속 팀<input required value={team} onChange={(event) => setTeam(event.target.value)} /></label>
          </>
        )}
        <label>
          회사 이메일
          <input autoFocus={!signupMode} required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>비밀번호<input required type="password" defaultValue="batontouch" /></label>
        <button className={styles.submit} type="submit">{signupMode ? '회원가입하기' : '로그인'}</button>
      </form>
      <div className={styles.switcher}>
        <span>{signupMode ? '이미 계정이 있나요?' : '처음이신가요?'}</span>
        <button type="button" onClick={() => onModeChange(signupMode ? 'login' : 'signup')}>
          {signupMode ? '로그인' : '회원가입'}
        </button>
      </div>
    </Modal>
  )
}
