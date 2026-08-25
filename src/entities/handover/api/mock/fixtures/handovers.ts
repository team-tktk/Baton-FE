import type { Handover, HandoverSummary } from '../../../model/types'
import { defaultAttachmentFixtures } from './attachments'
import { interviewQuestionFixtures } from './interview'
import { memberFixtures } from './members'

const owner = memberFixtures[0]!
const recipient = memberFixtures[1]!

export const primaryHandoverFixture: Handover = {
  id: 'handover-moastore-operations',
  title: '모아스토어 운영팀 업무 인수인계',
  owner,
  recipient,
  recipients: [recipient],
  team: '운영팀',
  status: 'submitted',
  deliveredAtLabel: '오늘 14:30',
  attachments: defaultAttachmentFixtures,
  interviewQuestions: interviewQuestionFixtures,
  firstSchedule: {
    dayLabel: '월요일',
    time: '10:00',
    title: '가을 할인전 내부 미팅',
    description: '쿠폰안과 행사 요청사항을 확인한 뒤 행사 설정을 준비해요.',
  },
  document: {
    title: '업무 인수인계',
    intro: '최서윤님의 업무를 정하늘님에게 전달합니다.',
    scope: '프로모션 운영 · 주문 관리 · 배송업체 협업',
    purpose: '프로모션과 주문 운영이 담당자 변경 후에도 멈추지 않도록 합니다.',
    completionStandard: '정하늘님이 행사 일정, 주문 현황, 배송 이슈를 독립적으로 처리할 수 있습니다.',
    statusLabel: '전달 완료 · 최신 버전',
    updatedAtLabel: '2026. 09. 11.',
    activeTasks: [
      {
        id: 'task-autumn-campaign',
        title: '가을 정기 할인전 준비',
        statusLabel: '진행 중',
        tone: 'blue',
        description: '행사 상품과 쿠폰 범위를 정하고 있습니다.',
        nextAction: '상품팀·마케팅팀과 쿠폰 범위 확정',
        meta: '9월 12일',
      },
      {
        id: 'task-delivery-vendor',
        title: '새 배송업체 연결',
        statusLabel: '답변 대기',
        tone: 'yellow',
        description: '물류팀의 반품 기간 답변을 기다리고 있습니다.',
        nextAction: '답변 후 배송업체 신청 화면에 등록',
        meta: '오세진 · 물류팀',
      },
    ],
    recurringTasks: [
      {
        id: 'task-weekly-orders',
        title: '주간 주문 현황 정리',
        statusLabel: '매주 반복',
        tone: 'green',
        description: '주문 수, 반품, 문의를 모아 팀에 공유합니다.',
        nextAction: '월요일 확인 → 화요일 팀 검토',
        meta: '매주 월요일',
      },
    ],
    criteria: [
      {
        id: 'coupon',
        title: '쿠폰 할인 승인 순서',
        defaultText: '쿠폰 할인율이 10%를 넘으면 예산과 승인 순서를 확인합니다.',
      },
      {
        id: 'delivery',
        title: '배송업체 회신 기준',
        defaultText: '배송업체 답변이 늦으면 물류팀에 먼저 공유합니다.',
      },
      {
        id: 'report',
        title: '주문 현황 공유일',
        defaultText: '품절 가능 재고가 10개 미만이면 상품 노출을 조정합니다.',
      },
    ],
    people: [
      { id: 'user-yoon-yerin', name: '윤예린', team: '마케팅팀', responsibility: '쿠폰 예산 · 행사 노출' },
      { id: 'user-kim-minjun', name: '김민준', team: '상품팀', responsibility: '행사 상품 · 재고' },
      { id: 'user-oh-sejin', name: '오세진', team: '물류팀', responsibility: '배송 조건 · 반품' },
    ],
    tools: [
      '주간 주문 현황 양식.xlsx — 매주 주문과 반품 기록',
      '가을 할인전 준비 메모.docx — 행사 조건과 일정',
      '문제상황 대응방법.pdf — 예외 상황 대응 기준',
    ],
    checklist: [
      '진행 중인 행사 일정과 남은 요청 확인',
      '전날 주문 누락과 배송 지연 건 확인',
      '주요 관계자에게 담당자 변경 안내',
    ],
    schedule: [
      { cycle: '매일', task: '주문·배송 이상 확인', detail: '오전 10시 전 확인' },
      { cycle: '매주 월요일', task: '주문 현황 집계', detail: '반품과 문의 포함해 공유' },
      { cycle: '매월 말', task: '행사 실적 정리', detail: '다음 달 개선점 기록' },
    ],
    accessAccounts: [
      { tool: '운영 어드민', permission: '주문 조회·행사 설정', status: '사용 가능' },
      { tool: '공유 드라이브', permission: '운영팀 자료 편집', status: '사용 가능' },
      { tool: '배송업체 포털', permission: '신청·반품 조회', status: '초대 필요' },
    ],
    confirmedCriteria: [],
  },
  review: {
    checklist: [
      { id: 'review-next-actions', label: '담당 업무와 다음 할 일이 명확해요', checked: true },
      { id: 'review-criteria', label: '판단 기준과 예외 상황이 포함됐어요', checked: true },
      { id: 'review-access', label: '필요한 첨부 자료와 권한이 준비됐어요', checked: false },
    ],
    comments: [],
  },
}

export const receivedHandoverFixtures: HandoverSummary[] = [
  {
    id: primaryHandoverFixture.id,
    person: '최서윤',
    team: '운영팀',
    scope: primaryHandoverFixture.document.scope,
    date: '오늘 14:30',
    status: 'submitted',
    statusLabel: '확인 전',
    tone: 'blue',
    tasks: 3,
    files: 3,
  },
  {
    id: 'handover-cs-support',
    person: '박지민',
    team: 'CS팀',
    scope: '고객 문의 대응 · VOC 정리 · 환불 처리',
    date: '8월 22일',
    status: 'in-progress',
    statusLabel: '진행 중',
    tone: 'yellow',
    tasks: 5,
    files: 4,
  },
  {
    id: 'handover-monthly-settlement',
    person: '이서진',
    team: '운영지원팀',
    scope: '월간 정산 · 세금계산서 · 비용 보고',
    date: '8월 18일',
    status: 'completed',
    statusLabel: '확인 완료',
    tone: 'green',
    tasks: 4,
    files: 2,
  },
]
