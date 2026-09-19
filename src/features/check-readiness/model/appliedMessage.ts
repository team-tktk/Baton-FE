import type { ReadinessFixApplied } from '@/entities/handover'

/**
 * 보완을 적용한 뒤 안내 문구. 서버가 적용하면서 이미 다시 평가하므로 점수 변화를 함께 알려 준다.
 * 점수가 그대로면 적용이 안 된 것처럼 보이기 쉬워, 그 영역을 아직 어떻게 보는지까지 적는다.
 */
export function appliedMessage({ fix, readiness }: ReadinessFixApplied, previousScore: number | null) {
  const done = `${fix.sectionLabel}에 반영했어요`
  if (!readiness) return `${done}. 점수를 다시 계산하고 있어요`
  if (previousScore !== null && previousScore !== readiness.score) return `${done} · 점수 ${previousScore}점 → ${readiness.score}점`
  const area = readiness.areas.find((item) => item.area === fix.area)
  const remaining = area && area.status !== 'sufficient' ? ` · ${area.label}: 아직 ${area.statusLabel}` : ''
  return `${done}. 점수는 ${readiness.score}점 그대로예요${remaining}`
}
