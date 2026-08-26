import type { Handover } from '@/entities/handover'

/**
 * 검토 체크리스트 기본 항목.
 * 서버는 체크리스트를 만들어 주지 않고 PATCH로 받은 목록을 그대로 저장한다.
 * 관리자가 첫 항목을 체크하는 순간 이 목록이 서버에 생성된다.
 */
export const DEFAULT_REVIEW_CHECKLIST = [
  { id: 'default-next-actions', label: '담당 업무와 다음 할 일이 명확해요', checked: false },
  { id: 'default-criteria', label: '판단 기준과 예외 상황이 포함됐어요', checked: false },
  { id: 'default-access', label: '필요한 첨부 자료와 권한이 준비됐어요', checked: false },
]

/** 서버에 저장된 체크리스트가 없으면 기본 항목으로 채워 관리자가 승인까지 갈 수 있게 한다. */
export function withReviewChecklist(handover: Handover): Handover {
  if (handover.review.checklist.length > 0) return handover
  return { ...handover, review: { ...handover.review, checklist: DEFAULT_REVIEW_CHECKLIST.map((item) => ({ ...item })) } }
}
