import { useEffect } from 'react'

import { Progress } from '@/shared/ui/progress'

import styles from './AnalysisProgress.module.css'

export const ANALYSIS_DELAY_MS = 7_200

interface AnalysisProgressProps { fileCount: number; onComplete: () => void }

export function AnalysisProgress({ fileCount, onComplete }: AnalysisProgressProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, ANALYSIS_DELAY_MS)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <section className={styles.analysis}>
      <p>업로드한 파일 {fileCount}개 분석 중</p>
      <h1>인수인계 초안을<br />만들고 있어요</h1>
      <div className={styles.hints}>
        <p style={{ animationDelay: '0s' }}>파일에 있는 내용은 다시 묻지 않아요.</p>
        <p style={{ animationDelay: '2.4s' }}>자료에 없는 기준만 짧게 확인해요.</p>
        <p style={{ animationDelay: '4.8s' }}>확인한 답변은 문서에 바로 반영돼요.</p>
      </div>
      <Progress label="업무 자료 분석 중" value={65} />
    </section>
  )
}
