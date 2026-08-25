import { useDemoAuth } from '../model/useDemoAuth'
import styles from './ProfileMenu.module.css'

interface ProfileMenuProps {
  onHandovers: () => void
}

export function ProfileMenu({ onHandovers }: ProfileMenuProps) {
  const { logout, user } = useDemoAuth()
  return (
    <section className={styles.menu}>
      <header>
        <strong>{user.name}</strong>
        <span>{user.email}</span>
        <small>{user.organization} · {user.team}</small>
      </header>
      <button type="button" onClick={onHandovers}>내 인수인계</button>
      <button className={styles.logout} type="button" onClick={logout}>로그아웃</button>
    </section>
  )
}
