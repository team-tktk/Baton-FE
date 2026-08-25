import type { Handover, HandoverSummary } from '../../../model/types'
import { csAttachmentFixtures, defaultAttachmentFixtures, settlementAttachmentFixtures } from './attachments'
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
    updatedAtLabel: '2026. 08. 26.',
    activeTasks: [
      {
        id: 'task-autumn-campaign',
        title: '가을 정기 할인전 준비',
        statusLabel: '진행 중',
        tone: 'blue',
        description: '행사 상품과 쿠폰 범위를 정하고 있습니다.',
        nextAction: '상품팀·마케팅팀과 쿠폰 범위 확정',
        meta: '8월 28일',
        criterionId: 'coupon',
      },
      {
        id: 'task-delivery-vendor',
        title: '새 배송업체 연결',
        statusLabel: '답변 대기',
        tone: 'yellow',
        description: '물류팀의 반품 기간 답변을 기다리고 있습니다.',
        nextAction: '답변 후 배송업체 신청 화면에 등록',
        meta: '오세진 · 물류팀',
        criterionId: 'delivery',
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
        criterionId: 'report',
      },
    ],
    criteria: [
      {
        id: 'coupon',
        title: '쿠폰 할인 승인 순서',
        defaultText: '쿠폰 할인율이 10%를 넘으면 예산과 승인 순서를 확인합니다.',
        question: '10%를 넘는 쿠폰은 누구에게 먼저 확인하나요?',
        options: ['마케팅 → 팀장', '팀장에게 바로'],
      },
      {
        id: 'delivery',
        title: '배송업체 회신 기준',
        defaultText: '배송업체 답변이 늦으면 물류팀에 먼저 공유합니다.',
        question: '답변이 늦을 때 언제 물류팀에 알리나요?',
        options: ['오늘 오후 3시', '다음 날 오전'],
      },
      {
        id: 'report',
        title: '주문 현황 공유일',
        defaultText: '품절 가능 재고가 10개 미만이면 상품 노출을 조정합니다.',
        question: '주간 주문 현황을 팀에 언제 공유하나요?',
        options: ['화요일', '수요일'],
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

export const csSupportHandoverFixture: Handover = {
  id: 'handover-cs-support',
  title: '고객 문의 대응 업무 인수인계',
  owner: memberFixtures[6]!,
  recipient: memberFixtures[8]!,
  recipients: [memberFixtures[8]!],
  team: 'CS팀',
  status: 'revision-requested',
  deliveredAtLabel: '어제 17:20',
  attachments: csAttachmentFixtures,
  interviewQuestions: [],
  firstSchedule: {
    dayLabel: '오늘',
    time: '09:30',
    title: '미처리 고객 문의 점검',
    description: '전날 미처리 티켓과 환불 승인 대기 건을 확인하고 담당자를 배정해요.',
  },
  document: {
    title: '고객 문의 대응 업무 인수인계',
    intro: '박지민님의 고객 문의 대응 업무를 김수현님에게 전달합니다.',
    scope: '고객 문의 대응 · VOC 정리 · 환불 처리',
    purpose: '담당자 변경 중에도 고객 답변 시간과 환불 처리 기준을 안정적으로 유지합니다.',
    completionStandard: '김수현님이 문의 우선순위를 판단하고 예외 환불을 승인 절차에 따라 처리할 수 있습니다.',
    statusLabel: '보완 요청 · 답변 기준 확인 필요',
    updatedAtLabel: '2026. 08. 25.',
    activeTasks: [
      { id: 'task-cs-backlog', title: '미처리 문의 18건 정리', statusLabel: '진행 중', tone: 'blue', description: '배송 지연 문의가 집중되어 우선 답변이 필요합니다.', nextAction: '배송 지연 7건에 예상 도착일 일괄 안내', meta: '오늘 11:00', criterionId: 'cs-priority' },
      { id: 'task-refund-review', title: '예외 환불 승인 대기', statusLabel: '승인 대기', tone: 'yellow', description: '정책 기간이 지난 환불 요청 3건을 검토하고 있습니다.', nextAction: '증빙 확인 후 CS 리더 승인 요청', meta: '3건', criterionId: 'refund-approval' },
    ],
    recurringTasks: [
      { id: 'task-weekly-voc', title: '주간 VOC 리포트', statusLabel: '매주 반복', tone: 'green', description: '반복 문의와 개선 요청을 유형별로 정리합니다.', nextAction: '금요일 오전 제품팀에 공유', meta: '매주 금요일', criterionId: 'voc-report' },
    ],
    criteria: [
      { id: 'cs-priority', title: '문의 우선순위', defaultText: '결제 오류와 배송 분실 문의를 최우선으로 처리합니다.', question: '같은 등급의 문의가 몰리면 어떤 순서로 답변하나요?', options: ['접수 순서', '고객 영향도 순서'] },
      { id: 'refund-approval', title: '예외 환불 승인', defaultText: '정책 기간이 지난 환불은 CS 리더 승인을 받습니다.', question: '승인 전에 고객에게 무엇을 안내하나요?', options: ['처리 예정 시간', '승인 완료 후 안내'] },
      { id: 'voc-report', title: 'VOC 공유 기준', defaultText: '동일 유형 문의가 5건 이상이면 제품팀에 공유합니다.', question: '긴급 이슈는 정기 리포트를 기다리나요?', options: ['즉시 공유', '금요일에 공유'] },
    ],
    people: [
      { id: 'user-lee-dohyeon', name: '이도현', team: '운영팀', responsibility: '예외 환불 최종 승인' },
      { id: 'user-kim-minjun', name: '김민준', team: '상품팀', responsibility: '상품 정보 오류 확인' },
      { id: 'user-oh-sejin', name: '오세진', team: '물류팀', responsibility: '배송 지연 및 분실 확인' },
    ],
    tools: ['고객문의 응대 플레이북.pdf — 문의 유형별 답변 원칙', '주간 VOC 분류표.xlsx — 반복 문의와 개선 요청 기록', '고객안내 메시지 템플릿.pptx — 상황별 안내 문구'],
    checklist: ['미처리 문의와 SLA 초과 건 확인', '예외 환불 승인 대기 건 확인', '배송 지연 공지 문구 최신화'],
    schedule: [
      { cycle: '매일', task: '미처리 문의 점검', detail: '오전 9시 30분 SLA 초과 건 확인' },
      { cycle: '매주 금요일', task: 'VOC 리포트 공유', detail: '반복 문의와 개선 요청 정리' },
    ],
    accessAccounts: [
      { tool: '고객 상담 어드민', permission: '문의 조회·답변', status: '사용 가능' },
      { tool: '환불 승인 보드', permission: '승인 요청 작성', status: '권한 확인 필요' },
    ],
    confirmedCriteria: [
      { label: '문의 우선순위', value: '결제 오류와 배송 분실 문의를 최우선으로 처리' },
    ],
  },
  review: {
    checklist: [
      { id: 'review-cs-priority', label: '문의 우선순위가 명확해요', checked: true },
      { id: 'review-refund', label: '환불 예외 승인 기준이 포함됐어요', checked: false },
      { id: 'review-message', label: '고객 안내 문구가 준비됐어요', checked: true },
    ],
    comments: [{ id: 'comment-cs-1', authorName: '이도현', text: '정책 기간이 지난 환불의 승인 금액 기준을 추가해 주세요.', createdAtLabel: '어제 18:05' }],
  },
}

export const monthlySettlementHandoverFixture: Handover = {
  id: 'handover-monthly-settlement',
  title: '월간 정산 업무 인수인계',
  owner: memberFixtures[7]!,
  recipient: memberFixtures[9]!,
  recipients: [memberFixtures[9]!],
  team: '운영지원팀',
  status: 'approved',
  deliveredAtLabel: '8월 18일',
  attachments: settlementAttachmentFixtures,
  interviewQuestions: [],
  firstSchedule: {
    dayLabel: '9월 1일',
    time: '10:00',
    title: '8월 매출 정산 시작',
    description: 'PG사 입금액과 주문 매출을 대조하고 차이 내역을 정리해요.',
  },
  document: {
    title: '월간 정산 업무 인수인계',
    intro: '이서진님의 월간 정산 업무를 한유진님에게 전달합니다.',
    scope: '월간 정산 · 세금계산서 · 비용 보고',
    purpose: '매출과 입금액 차이를 조기에 발견하고 월 마감 일정을 지킵니다.',
    completionStandard: '한유진님이 매출 대사부터 세금계산서 발행과 비용 보고까지 독립적으로 완료할 수 있습니다.',
    statusLabel: '승인 완료 · 최신 버전',
    updatedAtLabel: '2026. 08. 18.',
    activeTasks: [
      { id: 'task-august-settlement', title: '8월 매출 정산 준비', statusLabel: '준비 중', tone: 'blue', description: '채널별 매출 자료와 PG사 입금 내역을 모으고 있습니다.', nextAction: '누락된 제휴몰 매출 자료 요청', meta: '9월 3일', criterionId: 'settlement-gap' },
    ],
    recurringTasks: [
      { id: 'task-tax-invoice', title: '세금계산서 발행', statusLabel: '매월 반복', tone: 'green', description: '거래처별 공급가액과 사업자 정보를 확인해 발행합니다.', nextAction: '미발행 거래처 목록 확인', meta: '매월 5영업일', criterionId: 'tax-deadline' },
      { id: 'task-cost-report', title: '월간 비용 보고', statusLabel: '매월 반복', tone: 'violet', description: '예산 대비 실제 비용과 주요 증감 사유를 보고합니다.', nextAction: '증감률 10% 이상 항목에 사유 작성', meta: '매월 7영업일', criterionId: 'cost-gap' },
    ],
    criteria: [
      { id: 'settlement-gap', title: '매출 차이 처리 기준', defaultText: '차이가 1만원을 넘으면 주문 단위로 원인을 확인합니다.', options: [] },
      { id: 'tax-deadline', title: '세금계산서 마감', defaultText: '매월 5영업일까지 발행을 완료합니다.', options: [] },
      { id: 'cost-gap', title: '비용 증감 보고', defaultText: '전월 대비 10% 이상 변동된 항목은 사유를 함께 기록합니다.', options: [] },
    ],
    people: [
      { id: 'user-lee-dohyeon', name: '이도현', team: '운영팀', responsibility: '정산 차이 내역 확인' },
      { id: 'user-yoon-yerin', name: '윤예린', team: '마케팅팀', responsibility: '광고비 증빙 전달' },
    ],
    tools: ['월간 정산 캘린더.xlsx — 채널별 마감일과 담당자', '세금계산서 발행 가이드.pdf — 발행 절차와 예외 기준'],
    checklist: ['PG사별 입금 내역 다운로드', '제휴몰 매출 자료 수신 확인', '미발행 세금계산서 거래처 확인'],
    schedule: [
      { cycle: '매월 3영업일', task: '매출·입금 대사', detail: 'PG사 및 제휴몰별 차이 확인' },
      { cycle: '매월 5영업일', task: '세금계산서 발행', detail: '미발행 거래처 재확인' },
      { cycle: '매월 7영업일', task: '비용 보고', detail: '10% 이상 증감 사유 포함' },
    ],
    accessAccounts: [
      { tool: '정산 어드민', permission: '매출·입금 내역 조회', status: '사용 가능' },
      { tool: '전자세금계산서', permission: '조회·발행', status: '사용 가능' },
    ],
    confirmedCriteria: [
      { label: '매출 차이 처리 기준', value: '1만원 초과 시 주문 단위 원인 확인' },
      { label: '세금계산서 마감', value: '매월 5영업일까지 발행 완료' },
    ],
  },
  review: {
    checklist: [
      { id: 'review-settlement', label: '정산 순서와 마감일이 명확해요', checked: true },
      { id: 'review-evidence', label: '필요한 증빙 자료가 준비됐어요', checked: true },
      { id: 'review-exception', label: '차이 발생 시 대응 기준이 포함됐어요', checked: true },
    ],
    comments: [{ id: 'comment-settlement-1', authorName: '이도현', text: '마감 일정과 차이 처리 기준 확인했습니다.', createdAtLabel: '8월 18일' }],
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
    status: 'approved',
    statusLabel: '확인 완료',
    tone: 'green',
    tasks: 4,
    files: 2,
  },
]
