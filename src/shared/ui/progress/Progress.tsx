import type { HTMLAttributes } from 'react'

import styles from './Progress.module.css'

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  label: string
}

export function Progress({ label, max = 100, value, ...props }: ProgressProps) {
  const ratio = Math.min(1, Math.max(0, value / max))
  return (
    <div aria-label={label} aria-valuemax={max} aria-valuemin={0} aria-valuenow={value} role="progressbar" {...props}>
      <span className={styles.track}><i style={{ width: `${ratio * 100}%` }} /></span>
    </div>
  )
}
