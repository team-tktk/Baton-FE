import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AuthModal, ProfileMenu, SignupModal, useAuth } from '@/features/auth'
import { Icon, type IconName } from '@/shared/ui/icon'
import { useToast } from '@/shared/ui/toast'

import styles from './HomePage.module.css'

const roles: Array<{ icon: IconName; kicker: string; title: string; description: string; path: string; primary?: boolean }> = [
  { icon: 'upload', kicker: '업무를 넘겨야 하나요?', title: '인수인계 하기', description: '자료를 올리고 AI가 만든 초안을 확인해요', path: '/handovers/new/setup', primary: true },
  { icon: 'briefcase', kicker: '업무를 전달받았나요?', title: '인수인계 받기', description: '먼저 할 일과 궁금한 내용을 확인해요', path: '/handovers/received' },
  { icon: 'users', kicker: '진행 상황을 보고 싶나요?', title: '인수인계 확인하기', description: '빠진 업무와 전달 상태를 한눈에 확인해요', path: '/reviews' },
]

type AuthMode = 'login' | 'signup'

export function HomePage() {
  const navigate = useNavigate()
  const { sessionCheckFailed, status, user } = useAuth()
  const { showToast } = useToast()
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const authTriggerRef = useRef<HTMLElement | null>(null)

  const openAuth = (event: React.MouseEvent<HTMLButtonElement>, mode: AuthMode) => {
    authTriggerRef.current = event.currentTarget
    setAuthMode(mode)
  }

  const completeSignup = (email: string) => {
    setLoginEmail(email)
    setAuthMode('login')
    showToast('회원가입이 완료됐어요. 로그인해 주세요.')
  }

  return (
    <main className={styles.main}>
      <section className={styles.landing}>
        <div className={styles.brand}>
          <span><img alt="" src="/batontouch-icon.png" /></span>
          <span><small>업무 자동 인수인계 서비스</small><strong>BATON</strong></span>
        </div>
        <nav aria-label="계정" className={styles.auth}>
          {status === 'loading' ? (
            <span aria-label="로그인 상태 확인 중" className={styles.authLoading} role="status" />
          ) : status === 'anonymous' ? (
            <>
              <button className={styles.login} type="button" onClick={(event) => openAuth(event, 'login')}>로그인</button>
              <button className={styles.signup} type="button" onClick={(event) => openAuth(event, 'signup')}>회원가입</button>
            </>
          ) : user ? (
            <>
              <button className={styles.profile} type="button" onClick={() => setProfileOpen((value) => !value)}>
                <i>{user.name.slice(0, 1)}</i><span>{user.name}</span><Icon name="chevron" />
              </button>
              {profileOpen && <ProfileMenu onHandovers={() => navigate('/handovers/sent')} />}
            </>
          ) : null}
        </nav>
        {sessionCheckFailed && <p className={styles.sessionWarning} role="alert">로그인 상태를 확인하지 못했어요. 로그인하면 다시 연결합니다.</p>}
        <div className={styles.copy}>
          <h1>업무는 남기고,<br /><span>인수인계는 자동으로.</span></h1>
          <p>흩어진 업무 자료를 AI가 정리해<br />다음 담당자가 바로 이어서 일할 수 있어요.</p>
        </div>
        {status === 'authenticated' ? (
          <section aria-label="인수인계 메뉴" className={styles.actions}>
            {roles.map((role) => (
              <button className={`${styles.card} ${role.primary ? styles.primary : ''}`} key={role.title} type="button" onClick={() => navigate(role.path)}>
                <span className={styles.roleIcon}><Icon name={role.icon} /></span>
                <span className={styles.cardCopy}><small>{role.kicker}</small><strong>{role.title}</strong><em>{role.description}</em></span>
                <Icon name="arrow" />
              </button>
            ))}
          </section>
        ) : (
          <div className={styles.hero}>
            <img alt="흩어진 인수인계 자료가 하나의 흐름으로 정리되는 과정" src="/baton-hero-flow.svg" />
          </div>
        )}
      </section>
      <AuthModal
        key={`${authMode}-${loginEmail}`}
        initialEmail={loginEmail}
        open={authMode === 'login'}
        returnFocusRef={authTriggerRef}
        onClose={() => setAuthMode(null)}
        onSignup={() => setAuthMode('signup')}
      />
      <SignupModal
        key={authMode === 'signup' ? 'signup-open' : 'signup-closed'}
        open={authMode === 'signup'}
        returnFocusRef={authTriggerRef}
        onClose={() => setAuthMode(null)}
        onLogin={() => setAuthMode('login')}
        onSuccess={completeSignup}
      />
    </main>
  )
}
