import type { HandoverReadiness } from '@/entities/handover'

import type { ReadinessPhase } from './useDocumentReadiness'

export interface SubmitCheck {
  title: string
  reasons: string[]
}

/** 아직 충분하지 않은 영역 수. 점수 대신 "확인할 항목"으로 안내한다. */
export const countOpenItems = (readiness: HandoverReadiness | null) =>
  readiness?.areas.filter((area) => area.status !== 'sufficient').length ?? 0

/**
 * 제출은 막지 않는다. 인수인계 가능 등급이 아니거나 평가가 지금 문서를 반영하지 않으면 한 번 확인만 받는다.
 * 확인할 것이 없으면 null.
 */
export function checkBeforeSubmit(readiness: HandoverReadiness | null, phase: ReadinessPhase, dirty: boolean): SubmitCheck | null {
  if (!readiness) {
    return {
      title: phase === 'error' ? '준비도를 확인하지 못했어요' : '아직 준비도를 점검하고 있어요',
      reasons: ['점검 결과를 보지 않고 전달하면 빠진 내용을 놓칠 수 있어요.'],
    }
  }
  const outdated = readiness.stale || dirty
  if (readiness.grade === 'ready' && !outdated) return null

  const open = countOpenItems(readiness)
  const reasons: string[] = []
  if (readiness.grade !== 'ready') reasons.push(`아직 ‘${readiness.gradeLabel}’ 상태예요. 받는 사람이 빠진 내용 때문에 헤맬 수 있어요.`)
  if (outdated) reasons.push('점검한 뒤 문서가 바뀌어 결과가 지금 문서와 다를 수 있어요.')
  return { title: open > 0 ? `확인할 항목 ${open}개가 남아 있어요` : '준비도를 다시 확인해 주세요', reasons }
}
