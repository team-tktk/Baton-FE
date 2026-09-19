import { describe, expect, it } from 'vitest'

import type { HandoverReadiness, ReadinessAreaResult } from '@/entities/handover'
import { MockHandoverRepository } from '@/entities/handover'

import { canEditInDocument, containsAnchor, sectionElementId, toDraftIssues } from './draftIssues'
import { checkBeforeSubmit } from './submitCheck'

const ID = 'handover-moastore-operations'

const area = (overrides: Partial<ReadinessAreaResult>): ReadinessAreaResult => ({
  area: 'EXCEPTION', label: '예외 대응', criteria: '', weight: 15, status: 'partial', statusLabel: '일부 부족', percent: 50, keyIssue: true,
  section: 'RULES_AND_EXCEPTIONS', sectionLabel: '업무 기준과 예외', targetSections: [{ section: 'RULES_AND_EXCEPTIONS', label: '업무 기준과 예외' }],
  anchorText: null, summary: '', resolution: '', evidence: [], questions: [], deferredQuestions: [],
  ...overrides,
})

const readiness = (overrides: Partial<HandoverReadiness>): HandoverReadiness => ({
  evaluationId: 'e-1', rubricVersion: 'v1', score: 85, grade: 'ready', gradeLabel: '인수인계 가능',
  keyIssueCount: 0, stale: false, draftRevision: 1, evaluatedAt: '', areas: [], deferredQuestionCount: 0,
  ...overrides,
})

describe('draft issues', () => {
  it('groups weak areas by section and names the evidence', () => {
    const issues = toDraftIssues(readiness({ areas: [
      area({
        evidence: [{ fileId: 'f-1', fileName: '매뉴얼.pdf', locator: '1쪽', page: 1, quote: '' }, { fileId: 'f-2', fileName: '메모.docx', locator: '', page: null, quote: '' }],
        targetSections: [{ section: 'RULES_AND_EXCEPTIONS', label: '업무 기준과 예외' }, { section: 'CONFIRMED_CRITERIA', label: '확인된 업무 기준' }],
      }),
      area({ area: 'CONTACTS', label: '담당자', status: 'conflict', statusLabel: '충돌' }),
      area({ area: 'SCOPE', label: '업무 범위', status: 'sufficient', section: 'PURPOSE' }),
    ] }))

    expect(issues.RULES_AND_EXCEPTIONS).toEqual([
      expect.objectContaining({ label: '예외 대응', evidenceName: '매뉴얼.pdf 외 1개' }),
      expect.objectContaining({ label: '담당자', status: 'conflict', evidenceName: null }),
    ])
    expect(issues.CONFIRMED_CRITERIA).toEqual([expect.objectContaining({ label: '예외 대응' })])
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

  it('asks when it is not ready yet or the check is outdated, without showing a score', () => {
    const open = readiness({ grade: 'needs-improvement', gradeLabel: '보완 필요', areas: [area({}), area({ area: 'ACCESS' }), area({ area: 'SCOPE', status: 'sufficient' })] })
    expect(checkBeforeSubmit(open, 'ready', false)).toEqual({
      title: '확인할 항목 2개가 남아 있어요',
      reasons: ['아직 ‘보완 필요’ 상태예요. 받는 사람이 빠진 내용 때문에 헤맬 수 있어요.'],
    })
    expect(checkBeforeSubmit(readiness({}), 'ready', true)).toEqual({
      title: '준비도를 다시 확인해 주세요',
      reasons: ['점검한 뒤 문서가 바뀌어 결과가 지금 문서와 다를 수 있어요.'],
    })
    expect(checkBeforeSubmit(readiness({ stale: true }), 'ready', false)).not.toBeNull()
  })

  it('asks when there is no result yet', () => {
    expect(checkBeforeSubmit(null, 'evaluating', false)?.title).toBe('아직 준비도를 점검하고 있어요')
    expect(checkBeforeSubmit(null, 'error', false)?.title).toBe('준비도를 확인하지 못했어요')
  })
})
