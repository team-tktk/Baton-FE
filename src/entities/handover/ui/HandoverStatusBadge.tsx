import type { HandoverStatus } from '../model/types'
import { Badge } from '@/shared/ui/badge'

const labels: Record<HandoverStatus, string> = { draft: '작성 중', submitted: '확인 전', 'in-progress': '진행 중', 'revision-requested': '보완 요청', approved: '확인 완료' }
const tones: Record<HandoverStatus, 'neutral' | 'blue' | 'yellow' | 'green' | 'violet'> = { draft: 'neutral', submitted: 'blue', 'in-progress': 'yellow', 'revision-requested': 'violet', approved: 'green' }

export function HandoverStatusBadge({ label, status }: { label?: string; status: HandoverStatus }) {
  return <Badge tone={tones[status]}>{label ?? labels[status]}</Badge>
}
