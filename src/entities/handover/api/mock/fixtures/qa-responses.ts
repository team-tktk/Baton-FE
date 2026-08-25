import type { HandoverAnswer } from '../../../model/types'

interface QaResponseRule {
  keywords: string[]
  text: string
  source: string
}

export const qaResponseRules = [
  {
    keywords: ['첫날', '먼저'],
    text: '첫날에는 진행 중인 가을 할인전 일정과 남은 요청을 먼저 확인하세요. 그다음 전날 주문 누락과 배송 지연 건을 확인하면 됩니다.',
    source: '업무 인수인계 · 첫 주 체크리스트',
  },
  {
    keywords: ['12%', '왜'],
    text: '행사 상품이 30개 이상이면 12% 쿠폰을 먼저 제안하기로 했어요. 15% 쿠폰이 꼭 필요하면 메인 배너 노출도 함께 제안해요.',
    source: '가을 할인전 준비 메모 · 팀 대화 · 8월 21일',
  },
  {
    keywords: ['Nova', '늦', '배송'],
    text: '오늘 오후 3시까지 물류팀 답변이 없으면 오세진님에게 먼저 알리고, 내일까지 지연되면 배송업체 담당자 김서현님에게 예상 답변 일정을 공유하세요.',
    source: '문제 상황 대응 방법 · 할 일 목록',
  },
  {
    keywords: ['정리', '순서'],
    text: '매주 월요일 주문 수와 반품을 확인하고, 상품팀 문의를 모은 뒤 화요일에 팀과 함께 봐요. 수요일에는 정리한 내용을 공유해요.',
    source: '주간 주문 현황 양식 · 운영 담당 캘린더',
  },
  {
    keywords: ['환불', 'VOC', '고객 문의'],
    text: '환불 요청은 주문 상태와 귀책 사유를 먼저 확인하세요. 정책 밖 예외는 바로 처리하지 말고 CS 리더에게 승인 요청을 남긴 뒤 고객에게 예상 답변 시간을 안내합니다.',
    source: '환불 예외처리 기준 · 2장',
  },
  {
    keywords: ['정산', '세금계산서', '마감'],
    text: '매월 3영업일까지 전월 매출과 PG사 입금액을 대조하고, 차이가 나는 건은 증빙을 붙여 운영지원팀 공유 문서에 남깁니다. 세금계산서는 5영업일까지 발행을 완료합니다.',
    source: '월간 정산 캘린더 · 마감 체크리스트',
  },
] satisfies QaResponseRule[]

export const fallbackQaResponse = {
  text: '자료에서 답을 찾지 못했어요. 이도현 팀장님께 물어볼 질문으로 정리해드릴게요.',
  grounded: false,
  citations: [],
} satisfies HandoverAnswer
