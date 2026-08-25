import { Progress } from '@/shared/ui/progress'

import styles from './HandoverProgress.module.css'

const labels = ['기본 정보', '파일 업로드', 'AI 질문', '초안 확인', '전달']

export function HandoverProgress({ current }: { current: number }) {
  return (
    <nav aria-label="인수인계 진행 상황" className={styles.progress}>
      <div><strong>{current} / 5</strong><span>{labels[current - 1]}</span></div>
      <Progress label={`${labels[current - 1]} 단계`} max={5} value={current} />
    </nav>
  )
}
