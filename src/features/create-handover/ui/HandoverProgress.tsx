import { Icon } from '@/shared/ui/icon'

import styles from './HandoverProgress.module.css'

const HANDOVER_STEPS = ['기본 정보', '파일 업로드', '민감정보 확인', 'AI 분석', 'AI 질문', '초안 확인'] as const

interface HandoverProgressProps {
  /** 1부터 시작하는 현재 단계 */
  current: number
  /** 생성 화면에서는 홈 이동을 진행 표시 안에 함께 배치한다. */
  onHome?: () => void
}

/**
 * 각 단계에서 무엇을 하는지 한눈에 보여 주는 진행 표시.
 * 지나온 단계로 돌아가면 서버 상태(분석·질문 완료)와 어긋나므로 이동 기능은 두지 않는다.
 */
export function HandoverProgress({ current, onHome }: HandoverProgressProps) {
  return (
    <nav aria-label="인수인계 진행 상황" className={styles.progress}>
      <div className={styles.shell}>
        {onHome && (
          <>
            <button className={styles.home} type="button" onClick={onHome}><Icon name="back" /> <span>홈으로</span></button>
            <span aria-hidden="true" className={styles.divider} />
          </>
        )}
        <div className={styles.steps}>
          <div className={styles.summary}>
            <strong><span>{current}</span> / {HANDOVER_STEPS.length}</strong>
            <span>{HANDOVER_STEPS[current - 1]}</span>
          </div>
          <div
            aria-label={`${HANDOVER_STEPS[current - 1]} 단계, ${HANDOVER_STEPS.length}단계 중 ${current}단계`}
            aria-valuemax={HANDOVER_STEPS.length}
            aria-valuemin={1}
            aria-valuenow={current}
            className={styles.track}
            role="progressbar"
          >
            <span className={styles.trackFill} style={{ width: `${(current / HANDOVER_STEPS.length) * 100}%` }} />
          </div>
          <ol className={styles.stepList}>
            {HANDOVER_STEPS.map((label, index) => {
              const step = index + 1
              const state = step < current ? 'done' : step === current ? 'current' : 'upcoming'
              return (
                <li aria-current={state === 'current' ? 'step' : undefined} className={styles[state]} key={label}>
                  {label}{state === 'done' && <span> 완료</span>}
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </nav>
  )
}
