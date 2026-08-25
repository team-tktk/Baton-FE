import { type CSSProperties, useEffect } from 'react'

import type { HandoverAttachment } from '@/entities/handover'
import { Icon } from '@/shared/ui/icon'

import styles from './AnalysisProgress.module.css'

export const ANALYSIS_DELAY_MS = 7_200

interface AnalysisProgressProps {
  attachments: HandoverAttachment[]
  onComplete: () => void
}

const analysisLabels = ['업무와 일정 찾는 중', '반복 업무 정리 중', '예외 상황 확인 중']

export function AnalysisProgress({ attachments, onComplete }: AnalysisProgressProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, ANALYSIS_DELAY_MS)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <section className={styles.analysis}>
      <div className={styles.copy}>
        <p className={styles.status}><i /> 파일 {attachments.length}개를 읽고 있어요</p>
        <h1>업무의 흐름을<br />정리하고 있어요</h1>
        <p className={styles.description}>반복되는 일, 진행 중인 업무, 꼭 알아야 할 기준을 찾아 인수인계 문서로 구성합니다.</p>
        <div aria-label="분석 중 안내" className={styles.hints}>
          <p style={{ '--delay': '0s' } as CSSProperties}>파일에 있는 내용은 다시 묻지 않아요.</p>
          <p style={{ '--delay': '2.4s' } as CSSProperties}>자료에 없는 판단 기준만 짧게 확인해요.</p>
          <p style={{ '--delay': '4.8s' } as CSSProperties}>확인한 답변은 문서에 바로 반영돼요.</p>
        </div>
      </div>
      <div aria-hidden="true" className={styles.files}>
        <span className={styles.scanLine} />
        {attachments.map((attachment, index) => (
          <div className={styles.file} key={attachment.id} style={{ '--file-delay': `${index * 0.25}s` } as CSSProperties}>
            <span className={styles.fileIcon}><Icon name="file" /></span>
            <span><strong>{attachment.name}</strong><small>{analysisLabels[Math.min(index, analysisLabels.length - 1)]}</small></span>
            <i />
          </div>
        ))}
      </div>
      <div aria-label="업무 자료 분석 중" className={styles.progress} role="progressbar"><i /></div>
    </section>
  )
}
