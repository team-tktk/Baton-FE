import { Progress } from '@/shared/ui/progress'

import styles from './HandoverProgress.module.css'

const labels = ['기본 정보', '파일 업로드', 'AI 질문', '초안 확인', '전달']

interface HandoverProgressProps {
  compact?: boolean
  current: number
  total?: number
}

export function HandoverProgress({ compact = false, current, total = 5 }: HandoverProgressProps) {
  return (
    <nav aria-label="인수인계 진행 상황" className={`${styles.progress} ${compact ? styles.compact : ''}`.trim()}>
      <div className={styles.copy}>
        <strong>{current} / {total}</strong>
        <span>{labels[current - 1]}</span>
      </div>
      <Progress
        className={compact ? styles.compactBar : undefined}
        label={`${labels[current - 1]} 단계`}
        max={total}
        value={current}
      />
    </nav>
  )
}
