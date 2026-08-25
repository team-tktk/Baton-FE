import { type ReactNode, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { useToast } from '@/shared/ui/toast'

import { useAuth } from '../model/useAuth'

/**
 * 로그인한 사용자만 인수인계 화면에 들어올 수 있게 막는다.
 * 세션 확인이 끝나기 전에는 판단을 미루고 로딩 상태를 보여 준다.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
    if (status !== 'anonymous') return
    showToast('로그인이 필요한 화면이에요')
    navigate('/', { replace: true })
  }, [navigate, showToast, status])

  if (status !== 'authenticated') {
    return <main aria-live="polite" style={{ padding: '80px 24px', textAlign: 'center' }}>
      {status === 'loading' ? '로그인 상태를 확인하고 있어요…' : '로그인 화면으로 이동할게요…'}
    </main>
  }

  return <>{children}</>
}
