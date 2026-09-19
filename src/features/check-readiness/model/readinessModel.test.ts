import { describe, expect, it } from 'vitest'

import type { HandoverReadiness, ReadinessAreaResult } from '@/entities/handover'
import { MockHandoverRepository } from '@/entities/handover'

import { canEditInDocument, containsAnchor, sectionElementId, toDraftIssues } from './draftIssues'
import { checkBeforeSubmit } from './submitCheck'

const ID = 'handover-moastore-operations'

const area = (overrides: Partial<ReadinessAreaResult>): ReadinessAreaResult => ({
  area: 'EXCEPTION', label: '예외 대응', criteria: '', weight: 15, status: 'partial', statusLabel: '일부 부족', percent: 50, keyIssue: true,
  section: 'RULES_AND_EXCEPTIONS', sectionLabel: '업무 기준과 예외', anchorText: null, summary: '', resolution: '', evidence: [],
  ...overrides,
})

const readiness = (overrides: Partial<HandoverReadiness>): HandoverReadiness => ({
  evaluationId: 'e-1', rubricVersion: 'v1', score: 85, potentialScore: 100, grade: 'ready', gradeLabel: '인수인계 가능',
  keyIssueCount: 0, stale: false, draftRevision: 1, evaluatedAt: '', areas: [],
  ...overrides,
})

describe('draft issues', () => {
  it('groups weak areas by section and names the evidence', () => {
    const issues = toDraftIssues(readiness({ areas: [
      area({ evidence: [{ fileId: 'f-1', fileName: '매뉴얼.pdf', locator: '1쪽' }, { fileId: 'f-2', fileName: '메모.docx', locator: '' }] }),
      area({ area: 'CONTACTS', label: '담당자', status: 'conflict', statusLabel: '충돌' }),
      area({ area: 'SCOPE', label: '업무 범위', status: 'sufficient', section: 'PURPOSE' }),
    ] }))

    expect(issues.RULES_AND_EXCEPTIONS).toEqual([
      expect.objectContaining({ label: '예외 대응', evidenceName: '매뉴얼.pdf 외 1개' }),
      expect.objectContaining({ label: '담당자', status: 'conflict', evidenceName: null }),
    ])
    expect(issues.PURPOSE).toBeUndefined()
    expect(toDraftIssues(null)).toEqual({})
  })

  it('matches an anchor sentence regardless of spacing', () => {
    const issues = [{ area: 'EXCEPTION' as const, label: '예외 대응', status: 'partial' as const, statusLabel: '일부 부족', anchorText: '할인율이  10%를\n넘으면', evidenceName: null }]
    expect(containsAnchor('쿠폰 할인율이 10%를 넘으면 확인합니다.', issues)).toBe(true)
    expect(containsAnchor('배송업체 답변이 늦으면', issues)).toBe(false)
    expect(containsAnchor('아무 문장', undefined)).toBe(false)
  })

  it('offers editing only for sections with content in the editor', async () => {
    const { document } = await new MockHandoverRepository().getDocument(ID)
    expect(canEditInDocument(document, 'RULES_AND_EXCEPTIONS')).toBe(true)
    expect(canEditInDocument(document, 'ACCESS_ACCOUNTS')).toBe(false)
    expect(canEditInDocument({ ...document, criteria: [] }, 'RULES_AND_EXCEPTIONS')).toBe(false)
    expect(sectionElementId('FIRST_WEEK_CHECKLIST')).toBe('draft-section-first-week-checklist')
  })
})

describe('checkBeforeSubmit', () => {
  it('lets a ready, current evaluation through', () => {
    expect(checkBeforeSubmit(readiness({}), 'ready', false)).toBeNull()
  })

  it('asks when the score is below ready or the evaluation is outdated', () => {
    expect(checkBeforeSubmit(readiness({ score: 72, grade: 'needs-improvement', keyIssueCount: 2 }), 'ready', false)).toEqual({
      title: '준비도가 72점이에요',
      reasons: ['중요한 확인 2건이 남아 있어요. 받는 사람이 이 부분에서 헤맬 수 있어요.'],
    })
    expect(checkBeforeSubmit(readiness({}), 'ready', true)?.reasons).toEqual(['평가한 뒤 문서가 바뀌어 점수가 지금 문서와 다를 수 있어요.'])
    expect(checkBeforeSubmit(readiness({ stale: true }), 'ready', false)).not.toBeNull()
  })

  it('asks when there is no score yet', () => {
    expect(checkBeforeSubmit(null, 'evaluating', false)?.title).toBe('아직 준비도를 점검하고 있어요')
    expect(checkBeforeSubmit(null, 'error', false)?.title).toBe('준비도를 확인하지 못했어요')
  })
})
