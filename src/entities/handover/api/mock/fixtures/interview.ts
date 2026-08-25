import type { InterviewQuestion } from '../../../model/types'

export const interviewQuestionFixtures = [
  {
    id: 'interview-priority',
    question: '가을 할인전에서 문제가 생기면 무엇을 가장 먼저 확인하나요?',
    help: '자료에는 여러 대응 방법이 있어 실제로 먼저 보는 기준을 확인하고 싶어요.',
    options: [
      { label: '주문·쿠폰 오류', description: '결제와 쿠폰 적용 상태부터 확인해요.' },
      { label: '재고·배송 지연', description: '판매 가능 수량과 배송 일정을 먼저 봐요.' },
      { label: '고객 문의 증가', description: '반복되는 문의 내용을 먼저 확인해요.' },
      { label: '관계자 진행 상황', description: '상품팀과 마케팅팀의 답변부터 확인해요.' },
    ],
    status: 'pending',
    answer: null,
  },
  {
    id: 'interview-first-day',
    question: '정하늘님이 업무를 받은 첫날, 가장 먼저 해야 할 일은 무엇인가요?',
    help: '첫날 할 일을 초안의 맨 위에 배치할게요.',
    options: [
      { label: '전날 주문 확인', description: '주문 누락과 배송 지연 건을 먼저 확인해요.' },
      { label: '진행 중인 행사 확인', description: '행사 일정과 남은 요청을 먼저 살펴봐요.' },
      { label: '관계자에게 진행 상황 확인', description: '함께 일하는 사람에게 변경 사항을 물어봐요.' },
    ],
    status: 'pending',
    answer: null,
  },
  {
    id: 'interview-criteria',
    question: '자료에 적혀 있지 않은 중요한 판단 기준이 있나요?',
    help: '본인만 알고 있던 기준을 남기면 다음 담당자가 추측하지 않아도 돼요.',
    options: [
      { label: '쿠폰 변경 전 팀장 확인', description: '할인율이나 예산을 바꾸기 전에 확인받아요.' },
      { label: '재고 10개 미만이면 노출 조정', description: '품절 전에 상품 노출과 판매 수량을 조정해요.' },
      { label: '배송 지연은 물류팀에 먼저 공유', description: '배송업체보다 내부 물류팀에 먼저 알려요.' },
    ],
    status: 'pending',
    answer: null,
  },
] satisfies InterviewQuestion[]
