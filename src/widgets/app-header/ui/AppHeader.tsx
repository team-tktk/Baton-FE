import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'

import styles from './AppHeader.module.css'

export function AppHeader({ children }: PropsWithChildren) {
  return (
    <header className={styles.header}>
      <Link aria-label="BATON 홈" className={styles.brand} to="/">
        <img alt="" src="/batontouch-icon.png" />
        <strong>BATON</strong>
      </Link>
      {children}
    </header>
  )
}
