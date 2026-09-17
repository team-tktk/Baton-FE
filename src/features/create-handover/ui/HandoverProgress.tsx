import { Icon } from '@/shared/ui/icon'

import styles from './HandoverProgress.module.css'

const HANDOVER_STEPS = ['기본 정보', '파일 업로드', '민감정보 확인', 'AI 분석', 'AI 질문', '초안 확인'] as const

interface HandoverProgressProps {
  /** 1부터 시작하는 현재 단계 */
  current: number
  /** 화면 왼쪽 위 "홈으로" 버튼과 같은 줄에 놓일 때 폭을 줄여 겹치지 않게 한다. */
  besideHomeButton?: boolean
}

/**
 * 각 단계에서 무엇을 하는지 한눈에 보여 주는 진행 표시.
 * 지나온 단계로 돌아가면 서버 상태(분석·질문 완료)와 어긋나므로 이동 기능은 두지 않는다.
 */
export function HandoverProgress({ besideHomeButton = false, current }: HandoverProgressProps) {
  return (
    <nav aria-label="인수인계 진행 상황" className={`${styles.progress} ${besideHomeButton ? styles.besideHome : ''}`.trim()}>
      <ol>
        {HANDOVER_STEPS.map((label, index) => {
          const step = index + 1
          const state = step < current ? 'done' : step === current ? 'current' : 'upcoming'
          return (
            <li aria-current={state === 'current' ? 'step' : undefined} className={styles[state]} key={label}>
              <span className={styles.step}>
                <span aria-hidden="true" className={styles.marker}>{state === 'done' ? <Icon name="check" /> : step}</span>
                <span className={styles.label}>{label}</span>
                {state === 'done' && <span className={styles.srOnly}> 완료</span>}
              </span>
            </li>
          )
        })}
      </ol>
      <p aria-hidden="true" className={styles.mobileCurrent}>{current} / {HANDOVER_STEPS.length} · {HANDOVER_STEPS[current - 1]}</p>
    </nav>
  )
}
