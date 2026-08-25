import type { HTMLAttributes } from 'react'

import styles from './Badge.module.css'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'blue' | 'yellow' | 'green' | 'violet'
}

export function Badge({ className = '', tone = 'neutral', ...props }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[tone]} ${className}`.trim()} {...props} />
}
