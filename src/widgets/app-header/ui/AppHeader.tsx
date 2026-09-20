import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import { useDemo } from '@/shared/lib/demo'

import styles from './AppHeader.module.css'

export function AppHeader({ children }: PropsWithChildren) {
  const demo = useDemo()
  return (
    <header className={styles.header}>
      <Link aria-label="BATON 홈" className={styles.brand} to={demo ? '/demo' : '/'}>
        <img alt="" src="/batontouch-icon.png" />
        <strong>BATON</strong>
      </Link>
      {children}
    </header>
  )
}
