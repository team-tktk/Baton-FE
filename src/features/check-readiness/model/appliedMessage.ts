import type { HandoverReadiness, ReadinessFixApplied } from '@/entities/handover'

import { countOpenItems } from './submitCheck'

/**
 * 보완을 적용한 뒤 안내 문구. 서버가 적용하면서 바뀐 영역을 다시 점검하므로, 확인할 항목이 어떻게 바뀌었는지 알려 준다.
 * 고친 항목이 여전히 부족하면 적용이 안 된 것처럼 보이기 쉬워 그 항목 이름을 적는다.
 */
export function appliedMessage({ fix, readiness }: ReadinessFixApplied, previous: HandoverReadiness | null) {
  const changed = fix.sections.filter((change) => change.changed).map((change) => change.label)
  const done = `${changed.length > 0 ? changed.join('·') : '문서'}에 반영했어요`
  if (!readiness) return `${done}. 다시 점검하고 있어요`

  const fixedAreas = new Set(fix.areas.filter((area) => area.proposed).map((area) => area.area))
  const stillOpen = readiness.areas
    .filter((area) => fixedAreas.has(area.area) && area.status !== 'sufficient')
    .map((area) => area.label)
  const before = countOpenItems(previous)
  const after = countOpenItems(readiness)
  const progress = previous && before !== after ? ` · 확인할 항목 ${before}개 → ${after}개` : ''
  const remaining = stillOpen.length > 0 ? ` · 아직 확인 필요: ${stillOpen.join(', ')}` : ''
  return `${done}${progress}${remaining}`
}
