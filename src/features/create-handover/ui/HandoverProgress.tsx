import { Progress } from '@/shared/ui/progress'

import styles from './HandoverProgress.module.css'

const labels = ['기본 정보', '파일 업로드', 'AI 질문', '초안 확인', '전달 준비', '전달 완료']
const TOTAL_STEPS = labels.length

interface HandoverProgressProps {
  compact?: boolean
  current: number
}

export function HandoverProgress({ compact = false, current }: HandoverProgressProps) {
  return (
    <nav aria-label="인수인계 진행 상황" className={`${styles.progress} ${compact ? styles.compact : ''}`.trim()}>
      <div className={styles.copy}>
        <strong>{current} / {TOTAL_STEPS}</strong>
        <span>{labels[current - 1]}</span>
      </div>
      <Progress
        className={compact ? styles.compactBar : undefined}
        label={`${labels[current - 1]} 단계`}
        max={TOTAL_STEPS}
        value={current}
      />
    </nav>
  )
}
