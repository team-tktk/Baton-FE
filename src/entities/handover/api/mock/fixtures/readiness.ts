import type { ReadinessArea, ReadinessItemStatus, ReadinessRubric } from '../../../model/types'

export const readinessRubricFixture: ReadinessRubric = {
  version: 'v4',
  areas: [
    { area: 'SCOPE', label: '업무 범위', criteria: '맡을 업무와 맡지 않을 업무가 구분되어 있나요?', weight: 10, sections: ['PURPOSE', 'ONGOING_TASKS', 'RECURRING_TASKS'] },
    { area: 'PROCEDURE', label: '실행 절차', criteria: '반복 업무를 순서대로 따라 할 수 있나요?', weight: 20, sections: ['RECURRING_TASKS', 'ONGOING_TASKS', 'FIRST_WEEK_CHECKLIST'] },
    { area: 'PROGRESS', label: '진행 현황', criteria: '업무별 현재 상태와 다음 할 일, 기다리는 승인·회신을 알 수 있나요?', weight: 15, sections: ['ONGOING_TASKS', 'RECURRING_TASKS'] },
    { area: 'PRIORITY', label: '우선순위', criteria: '가장 중요하거나 밀리면 안 되는 업무와 먼저 할 일을 알 수 있나요?', weight: 10, sections: ['ONGOING_TASKS', 'RECURRING_TASKS', 'FIRST_WEEK_CHECKLIST'] },
    { area: 'COMPLETION', label: '완료 기준', criteria: '언제 인수인계가 끝났다고 볼 수 있나요?', weight: 10, sections: ['COMPLETION_CRITERIA'] },
    { area: 'EXCEPTION', label: '예외 대응', criteria: '문제가 생겼을 때 판단 기준과 연락처가 있나요?', weight: 15, sections: ['RULES_AND_EXCEPTIONS', 'CONFIRMED_CRITERIA'] },
    { area: 'SCHEDULE', label: '일정', criteria: '주기와 마감일이 적혀 있나요?', weight: 10, sections: ['SCHEDULE', 'RECURRING_TASKS'] },
    { area: 'CONTACTS', label: '담당자', criteria: '문의·승인·보고 대상과 전임자에게 물을 수 있는 기간·방법을 알 수 있나요?', weight: 10, sections: ['STAKEHOLDERS', 'RULES_AND_EXCEPTIONS'] },
  ],
  statusPercent: { sufficient: 100, partial: 50, conflict: 25, missing: 0 },
  readyScore: 80,
  minimumScore: 50,
  keyIssueCount: 3,
}

/** 목업 평가에서 내용이 있어도 부족하다고 볼 영역. 보완을 적용하면 충분으로 바뀐다. */
export const weakReadinessAreas: Partial<Record<ReadinessArea, {
  status: ReadinessItemStatus
  summary: string
  resolution: string
  anchorText?: string
  /** 충돌이면 서버처럼 "어느 쪽이 맞나요?"와 자료별 값을 묻는다. */
  options?: string[]
}>> = {
  PROCEDURE: {
    status: 'partial',
    summary: '주간 주문 현황을 어떤 순서로 정리하는지 빠져 있어요.',
    resolution: '확인 → 정리 → 공유 순서를 단계별로 적어 주세요.',
    anchorText: '주간 주문 현황 정리',
  },
  EXCEPTION: {
    status: 'partial',
    summary: '환불 오류가 났을 때 누구에게 넘기는지 적혀 있지 않아요.',
    resolution: '예외 상황별 담당자와 처리 순서를 적어 주세요.',
    anchorText: '쿠폰 할인율이 10%를 넘으면',
  },
  CONTACTS: {
    status: 'conflict',
    summary: '자료마다 쿠폰 예산 담당자가 달라요.',
    resolution: '현재 담당자를 확인해 한 명으로 정리해 주세요.',
    options: ['윤예린 · 마케팅팀', '오세진 · 물류팀'],
  },
}

export const READINESS_STATUS_LABELS: Record<ReadinessItemStatus, string> = {
  sufficient: '충분',
  partial: '일부 부족',
  conflict: '충돌',
  missing: '누락',
}
