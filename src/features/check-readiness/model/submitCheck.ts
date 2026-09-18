import type { HandoverReadiness } from '@/entities/handover'

import type { ReadinessPhase } from './useDocumentReadiness'

export interface SubmitCheck {
  title: string
  reasons: string[]
}

/**
 * 제출은 막지 않는다. 80점(인수인계 가능) 미만이거나 점수가 지금 문서를 반영하지 않으면 한 번 확인만 받는다.
 * 확인할 것이 없으면 null.
 */
export function checkBeforeSubmit(readiness: HandoverReadiness | null, phase: ReadinessPhase, dirty: boolean): SubmitCheck | null {
  if (!readiness) {
    return {
      title: phase === 'error' ? '준비도를 확인하지 못했어요' : '아직 준비도를 점검하고 있어요',
      reasons: ['점수를 보지 않고 전달하면 빠진 내용을 놓칠 수 있어요.'],
    }
  }
  const outdated = readiness.stale || dirty
  if (readiness.grade === 'ready' && !outdated) return null

  const reasons: string[] = []
  if (readiness.grade !== 'ready') {
    reasons.push(readiness.keyIssueCount > 0
      ? `중요한 확인 ${readiness.keyIssueCount}건이 남아 있어요. 받는 사람이 이 부분에서 헤맬 수 있어요.`
      : '인수인계 가능 기준(80점)에 못 미쳐요.')
  }
  if (outdated) reasons.push('평가한 뒤 문서가 바뀌어 점수가 지금 문서와 다를 수 있어요.')
  return { title: `준비도가 ${readiness.score}점이에요`, reasons }
}
