import { describe, expect, it } from 'vitest'

import type { HandoverReadiness, ReadinessFixApplied } from '@/entities/handover'

import { appliedMessage } from './appliedMessage'

const readiness = (score: number, status: 'sufficient' | 'partial'): HandoverReadiness => ({
  evaluationId: 'e-2', rubricVersion: 'v1', score, potentialScore: 75, grade: 'not-ready', gradeLabel: '준비 부족', keyIssueCount: 3,
  stale: false, draftRevision: 5, evaluatedAt: '',
  areas: [{
    area: 'PROCEDURE', label: '실행 절차', criteria: '', weight: 20, status, statusLabel: status === 'partial' ? '일부 부족' : '충분',
    percent: 50, keyIssue: true, section: 'RECURRING_TASKS', sectionLabel: '반복 업무', anchorText: null, summary: '', resolution: '', evidence: [],
  }],
})

const result = (next: HandoverReadiness | null) => ({
  fix: { area: 'PROCEDURE', sectionLabel: '첫 주 체크리스트' },
  draft: {},
  readiness: next,
}) as unknown as ReadinessFixApplied

describe('appliedMessage', () => {
  it('reports the score change', () => {
    expect(appliedMessage(result(readiness(52, 'sufficient')), 44)).toBe('첫 주 체크리스트에 반영했어요 · 점수 44점 → 52점')
  })

  it('says so when the score did not move and how the area is still judged', () => {
    expect(appliedMessage(result(readiness(44, 'partial')), 44)).toBe('첫 주 체크리스트에 반영했어요. 점수는 44점 그대로예요 · 실행 절차: 아직 일부 부족')
  })

  it('tells that the score is being recalculated when the server could not re-evaluate', () => {
    expect(appliedMessage(result(null), 44)).toBe('첫 주 체크리스트에 반영했어요. 점수를 다시 계산하고 있어요')
  })
})
