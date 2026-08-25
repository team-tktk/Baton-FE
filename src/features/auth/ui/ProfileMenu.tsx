import { useState } from 'react'

import { useToast } from '@/shared/ui/toast'

import { useAuth } from '../model/useAuth'
import styles from './ProfileMenu.module.css'

interface ProfileMenuProps {
  onHandovers: () => void
}

export function ProfileMenu({ onHandovers }: ProfileMenuProps) {
  const { logout, user } = useAuth()
  const { showToast } = useToast()
  const [loggingOut, setLoggingOut] = useState(false)

  if (!user) return null

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } catch {
      showToast('로그아웃에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoggingOut(false)
    }
  }

  const metadata = [user.team, user.position].filter(Boolean).join(' · ')

  return (
    <section className={styles.menu}>
      <header>
        <strong>{user.name}</strong>
        <span>{user.email}</span>
        {metadata && <small>{metadata}</small>}
      </header>
      <button type="button" onClick={onHandovers}>내 인수인계</button>
      <button className={styles.logout} disabled={loggingOut} type="button" onClick={handleLogout}>
        {loggingOut ? '로그아웃 중…' : '로그아웃'}
      </button>
    </section>
  )
}
