import { describe, expect, it } from 'vitest'

import type { HandoverReadiness, ReadinessAreaResult, ReadinessFixApplied, ReadinessItemStatus } from '@/entities/handover'

import { appliedMessage } from './appliedMessage'

const area = (key: ReadinessAreaResult['area'], label: string, status: ReadinessItemStatus): ReadinessAreaResult => ({
  area: key, label, criteria: '', weight: 10, status, statusLabel: status === 'sufficient' ? '충분' : '일부 부족', percent: 50, keyIssue: true,
  section: 'RECURRING_TASKS', sectionLabel: '반복 업무', targetSections: [{ section: 'RECURRING_TASKS', label: '반복 업무' }],
  anchorText: null, summary: '', resolution: '', evidence: [], questions: [], deferredQuestions: [],
})

const readiness = (areas: ReadinessAreaResult[]): HandoverReadiness => ({
  evaluationId: 'e', rubricVersion: 'v2', score: 0, grade: 'not-ready', gradeLabel: '준비 부족', keyIssueCount: 0,
  stale: false, draftRevision: 5, evaluatedAt: '', areas, deferredQuestionCount: 0,
})

const before = readiness([area('PROCEDURE', '실행 절차', 'partial'), area('EXCEPTION', '예외 대응', 'partial'), area('ACCESS', '접근 권한', 'partial')])

const result = (next: HandoverReadiness | null) => ({
  fix: {
    areas: [{ area: 'PROCEDURE', proposed: true }, { area: 'EXCEPTION', proposed: true }],
    sections: [{ label: '반복 업무', changed: true }, { label: '업무 기준과 예외', changed: true }, { label: '첫 주 체크리스트', changed: false }],
  },
  draft: {},
  readiness: next,
}) as unknown as ReadinessFixApplied

describe('appliedMessage', () => {
  it('names the changed sections and how many items are left', () => {
    const after = readiness([area('PROCEDURE', '실행 절차', 'sufficient'), area('EXCEPTION', '예외 대응', 'sufficient'), area('ACCESS', '접근 권한', 'partial')])
    expect(appliedMessage(result(after), before)).toBe('반복 업무·업무 기준과 예외에 반영했어요 · 확인할 항목 3개 → 1개')
  })

  it('names a fixed item that is still open so it does not look ignored', () => {
    const after = readiness([area('PROCEDURE', '실행 절차', 'partial'), area('EXCEPTION', '예외 대응', 'sufficient'), area('ACCESS', '접근 권한', 'partial')])
    expect(appliedMessage(result(after), before)).toBe('반복 업무·업무 기준과 예외에 반영했어요 · 확인할 항목 3개 → 2개 · 아직 확인 필요: 실행 절차')
  })

  it('tells that it is checking again when the server could not re-evaluate', () => {
    expect(appliedMessage(result(null), before)).toBe('반복 업무·업무 기준과 예외에 반영했어요. 다시 점검하고 있어요')
  })
})
