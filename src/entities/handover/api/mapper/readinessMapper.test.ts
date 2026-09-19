import { describe, expect, it } from 'vitest'

import type { ReadinessFixResponse, ReadinessResponse } from '../dto/types'
import { primaryHandoverFixture } from '../mock/fixtures/handovers'
import { applySectionValue, readSectionValue, toDocumentSectionValue, toHandoverReadiness, toReadableText, toReadinessFix } from './readinessMapper'

const fix: ReadinessFixResponse = {
  fixId: 'fix-1',
  status: 'NEEDS_INPUT',
  baseRevision: 3,
  stale: false,
  appliedRevision: null,
  areas: [{
    area: 'EXCEPTION',
    areaLabel: '예외 대응',
    status: 'PARTIAL',
    statusLabel: '일부 부족',
    sections: [],
    proposed: false,
    changeSummary: null,
    evidence: [{ sourceId: 'file-1', fileName: '운영 매뉴얼.pdf', locator: '3쪽' }, { sourceId: null, fileName: '이름만 있는 자료', locator: '' }],
    questions: [{ id: 'q-1', question: '환불 오류는 누가 맡나요?', reason: null, answer: '  ' }],
  }],
  sections: [{ section: 'RULES_AND_EXCEPTIONS', label: null, before: ['쿠폰 할인율이 10%를 넘으면 승인을 받습니다.'], after: null, changed: false }],
}

describe('readinessMapper', () => {
  it('converts section values into the document model shape', () => {
    expect(toDocumentSectionValue('PURPOSE', ' 목적 ')).toEqual({ section: 'PURPOSE', value: '목적' })
    expect(toDocumentSectionValue('RULES_AND_EXCEPTIONS', ['첫 기준'])).toEqual({
      section: 'RULES_AND_EXCEPTIONS',
      value: [{ id: 'rule-0', title: '업무 기준 1', defaultText: '첫 기준' }],
    })
    expect(toDocumentSectionValue('TOOLS', [{ name: '어드민', description: '주문 — 반품 확인' }])).toEqual({
      section: 'TOOLS',
      value: ['어드민 — 주문 — 반품 확인'],
    })
    expect(toDocumentSectionValue('ONGOING_TASKS', [{ title: '할인전 준비', status: '답변 대기' }]).value).toEqual([
      expect.objectContaining({ id: 'ongoing-0', title: '할인전 준비', tone: 'yellow' }),
    ])
  })

  it('treats a value of the wrong shape as an empty section', () => {
    expect(toDocumentSectionValue('PURPOSE', ['배열'])).toEqual({ section: 'PURPOSE', value: '' })
    expect(toDocumentSectionValue('STAKEHOLDERS', '문자열')).toEqual({ section: 'STAKEHOLDERS', value: [] })
    expect(toDocumentSectionValue('FIRST_WEEK_CHECKLIST', ['할 일', 3, null])).toEqual({ section: 'FIRST_WEEK_CHECKLIST', value: ['할 일'] })
    expect(toDocumentSectionValue('SCHEDULE', null)).toEqual({ section: 'SCHEDULE', value: [] })
  })

  it('keeps a pending fix without a proposal and drops evidence it cannot open', () => {
    expect(toReadinessFix(fix)).toMatchObject({
      id: 'fix-1',
      status: 'needs-input',
      unansweredCount: 0,
      areas: [{
        status: 'partial',
        sections: [],
        changeSummary: '',
        questions: [{ id: 'q-1', area: null, reason: '', options: [], deferred: false, answer: null }],
        evidence: [{ fileId: 'file-1', fileName: '운영 매뉴얼.pdf', locator: '3쪽', page: null, quote: '' }],
      }],
      sections: [{
        label: '업무 기준과 예외',
        before: { section: 'RULES_AND_EXCEPTIONS', value: [{ defaultText: '쿠폰 할인율이 10%를 넘으면 승인을 받습니다.' }] },
        after: null,
      }],
    })
    expect(toReadinessFix({ ...fix, sections: [{ ...fix.sections![0]!, after: [], changed: true }] }).sections[0]!.after)
      .toEqual({ section: 'RULES_AND_EXCEPTIONS', value: [] })
  })

  it('maps grade and item status to screen values', () => {
    const response: ReadinessResponse = {
      evaluationId: 'evaluation-1',
      rubricVersion: 'v1',
      score: 58,
      grade: 'NEEDS_IMPROVEMENT',
      gradeLabel: '보완 필요',
      keyIssueCount: 1,
      stale: true,
      draftRevision: 4,
      evaluatedAt: '2026-09-17T00:00:00Z',
      areas: [{
        area: 'ACCESS', label: '접근 권한', weight: 10, status: 'CONFLICT', statusLabel: '충돌', percent: 25, keyIssue: true,
        section: 'ACCESS_ACCOUNTS', sectionLabel: '접근 권한과 계정', anchorText: '  ', summary: '권한이 서로 달라요', resolution: null,
      }],
    }
    expect(toHandoverReadiness(response)).toMatchObject({
      grade: 'needs-improvement',
      stale: true,
      deferredQuestionCount: 0,
      areas: [{
        status: 'conflict', anchorText: null, resolution: '', criteria: '', evidence: [],
        targetSections: [{ section: 'ACCESS_ACCOUNTS', label: '접근 권한과 계정' }], questions: [], deferredQuestions: [],
      }],
    })
  })

  it('replaces section code names in AI text with screen names and fixes the particle', () => {
    expect(toReadableText('RULES_AND_EXCEPTIONS와 CONFIRMED_CRITERIA를 동일하게 수정해 주세요.'))
      .toBe('‘업무 기준과 예외’와 ‘확인된 업무 기준’을 동일하게 수정해 주세요.')
    expect(toReadableText('상세 절차를 recurringTasks에 보완해 주세요.')).toBe('상세 절차를 ‘반복 업무’에 보완해 주세요.')
    expect(toReadableText('TOOLS으로 옮기고 PURPOSE이다')).toBe('‘사용 도구와 자료’로 옮기고 ‘업무 개요’이다')
    expect(toReadableText(null)).toBe('')
  })

  it('reads and replaces a single section of a document', () => {
    const document = primaryHandoverFixture.document
    const next = applySectionValue(document, { section: 'FIRST_WEEK_CHECKLIST', value: ['새 할 일'] })

    expect(readSectionValue(next, 'FIRST_WEEK_CHECKLIST')).toEqual({ section: 'FIRST_WEEK_CHECKLIST', value: ['새 할 일'] })
    expect(next.criteria).toBe(document.criteria)
    expect(document.checklist).not.toEqual(['새 할 일'])
  })
})
