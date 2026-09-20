import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpHandoverRepository } from './HttpHandoverRepository'
import { primaryHandoverFixture } from './mock/fixtures/handovers'

const HANDOVER = '/api/v1/handovers/handover-1'
const BASE = `${HANDOVER}/readiness`

const handover = {
  id: 'handover-1',
  title: '프로모션 운영',
  status: 'EDITING',
  owner: { id: 'owner-1', name: '최서윤', team: '운영팀', position: '매니저' },
  participants: [{ userId: 'user-1', name: '정하늘', team: '운영팀', position: '주임', role: 'RECIPIENT' }],
  workScopes: [{ id: 'scope-1', title: '프로모션 운영' }],
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-17T00:00:00Z',
}

const draft = (revision: number, purpose = '운영이 멈추지 않게 합니다.') => ({
  content: { purpose, firstWeekChecklist: ['행사 일정 확인'] },
  revision,
  updatedAt: '2026-09-17T00:00:00Z',
})

const readiness = {
  evaluationId: 'evaluation-1',
  rubricVersion: 'v1',
  score: 58,
  grade: 'NEEDS_IMPROVEMENT',
  gradeLabel: '보완 필요',
  keyIssueCount: 1,
  stale: false,
  draftRevision: 3,
  evaluatedAt: '2026-09-17T00:00:00Z',
  areas: [{
    area: 'EXCEPTION', label: '예외 대응', criteria: '예외 기준이 있나요?', weight: 15, status: 'MISSING', statusLabel: '누락', percent: 0,
    keyIssue: true, section: 'RULES_AND_EXCEPTIONS', sectionLabel: '업무 기준과 예외', anchorText: null,
    summary: '환불 오류 담당자가 없어요', resolution: '담당자를 적어 주세요',
    evidence: [{ sourceId: 'file-1', fileName: '운영 매뉴얼.pdf', locator: '3쪽', page: 3, quote: '환불 오류는 담당자에게 넘긴다' }],
    targetSections: [{ section: 'RULES_AND_EXCEPTIONS', field: 'rulesAndExceptions', label: '업무 기준과 예외' }, { section: 'CONFIRMED_CRITERIA', field: 'confirmedCriteria', label: '확인된 업무 기준' }],
    questions: [{ question: '환불 오류는 누가 맡나요?', reason: '자료에 담당자가 없어요', options: null }],
    deferredQuestions: [{ id: 'cq-1', type: 'INTERVIEW', questionText: '환불 기한은 며칠인가요?', reason: null, area: 'EXCEPTION', targetSections: [] }],
  }],
  deferredQuestionCount: 1,
}

const fix = {
  fixId: 'fix-1',
  status: 'PROPOSED',
  baseRevision: 3,
  stale: false,
  appliedRevision: null,
  areas: [{
    area: 'EXCEPTION', areaLabel: '예외 대응', status: 'CONFLICT', statusLabel: '충돌',
    sections: [{ section: 'PURPOSE', field: 'purpose', label: '업무 개요' }], proposed: true, changeSummary: 'RULES_AND_EXCEPTIONS에 환불 예외를 보탰어요',
    evidence: [{ sourceId: 'file-1', fileName: '운영 매뉴얼.pdf', locator: '3쪽' }],
    questions: [{ id: 'q-1', area: 'EXCEPTION', question: '어느 쪽이 맞나요?', reason: null, options: ['7일', '7일', '14일'], clarificationQuestionId: 'cq-1', answer: '7일' }],
  }],
  sections: [
    { section: 'PURPOSE', field: 'purpose', label: '업무 개요', before: '운영이 멈추지 않게 합니다.', after: '운영과 환불 예외가 멈추지 않게 합니다.', changed: true },
    { section: 'UNKNOWN_SECTION', field: 'x', label: 'x', before: null, after: null, changed: false },
  ],
  unansweredCount: 0,
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' }, status })

const problem = (status: number, code: string) => jsonResponse({ status, detail: `${code} 발생`, code }, status)

function stubFetch(...responses: Response[]) {
  const fetchSpy = vi.fn<typeof fetch>()
  responses.forEach((response) => fetchSpy.mockResolvedValueOnce(response))
  vi.stubGlobal('fetch', fetchSpy)
  return fetchSpy
}

const bodyOf = (fetchSpy: ReturnType<typeof stubFetch>, index = 0) => JSON.parse(String(fetchSpy.mock.calls[index]![1]?.body))

afterEach(() => { vi.unstubAllGlobals() })

describe('HttpHandoverRepository readiness', () => {
  const repository = new HttpHandoverRepository()

  it('returns the document together with its revision', async () => {
    stubFetch(jsonResponse(draft(3)), jsonResponse(handover))

    await expect(repository.getDocument('handover-1')).resolves.toMatchObject({
      revision: 3,
      document: { title: '프로모션 운영', purpose: '운영이 멈추지 않게 합니다.', checklist: ['행사 일정 확인'] },
    })
  })

  it('sends baseRevision only when given and returns the saved revision', async () => {
    const { document } = primaryHandoverFixture
    const guarded = stubFetch(jsonResponse(draft(4)))
    await expect(repository.saveDocument('handover-1', document, 3)).resolves.toBe(4)
    expect(guarded.mock.calls[0]![1]?.method).toBe('PATCH')
    expect(bodyOf(guarded)).toMatchObject({ baseRevision: 3, content: { purpose: document.purpose } })

    const unguarded = stubFetch(jsonResponse(draft(5)))
    await repository.saveDocument('handover-1', document)
    expect(bodyOf(unguarded)).not.toHaveProperty('baseRevision')

    stubFetch(problem(409, 'AI_DRAFT_REVISION_CONFLICT'))
    await expect(repository.saveDocument('handover-1', document, 3)).rejects.toMatchObject({ status: 409, serverCode: 'AI_DRAFT_REVISION_CONFLICT' })
  })

  it('treats a missing evaluation as null but still fails when there is no draft', async () => {
    stubFetch(problem(404, 'READINESS_NOT_EVALUATED'))
    await expect(repository.getReadiness('handover-1')).resolves.toBeNull()

    stubFetch(problem(404, 'AI_DRAFT_NOT_FOUND'))
    await expect(repository.getReadiness('handover-1')).rejects.toMatchObject({ status: 404, serverCode: 'AI_DRAFT_NOT_FOUND' })

    const loaded = stubFetch(jsonResponse(readiness))
    await expect(repository.getReadiness('handover-1')).resolves.toMatchObject({
      score: 58,
      grade: 'needs-improvement',
      deferredQuestionCount: 1,
      areas: [{
        area: 'EXCEPTION',
        status: 'missing',
        evidence: [{ fileId: 'file-1', locator: '3쪽', page: 3, quote: '환불 오류는 담당자에게 넘긴다' }],
        targetSections: [{ section: 'RULES_AND_EXCEPTIONS', label: '업무 기준과 예외' }, { section: 'CONFIRMED_CRITERIA', label: '확인된 업무 기준' }],
        questions: [{ question: '환불 오류는 누가 맡나요?', options: [] }],
        deferredQuestions: [{ id: 'cq-1', question: '환불 기한은 며칠인가요?', reason: '' }],
      }],
    })
    expect(loaded.mock.calls[0]![0]).toBe(BASE)
  })

  it('evaluates and reads the rubric', async () => {
    const evaluated = stubFetch(jsonResponse(readiness))
    await expect(repository.evaluateReadiness('handover-1')).resolves.toMatchObject({ draftRevision: 3 })
    expect(evaluated.mock.calls[0]![0]).toBe(`${BASE}/evaluate`)
    expect(evaluated.mock.calls[0]![1]?.method).toBe('POST')

    const rubric = stubFetch(jsonResponse({
      version: 'v4',
      areas: [
        { area: 'PROGRESS', label: '진행 현황', criteria: '현재 상태를 알 수 있나요?', weight: 15, sections: ['ONGOING_TASKS'] },
        { area: 'PRIORITY', label: '우선순위', criteria: '먼저 할 일을 알 수 있나요?', weight: 10, sections: ['ONGOING_TASKS', 'FIRST_WEEK_CHECKLIST'] },
      ],
      statusPercent: { SUFFICIENT: 100, PARTIAL: 50, CONFLICT: 25, MISSING: 0 },
      readyScore: 80,
      minimumScore: 50,
      keyIssueCount: 3,
    }))
    await expect(repository.getReadinessRubric('handover-1')).resolves.toMatchObject({
      version: 'v4',
      areas: [
        { area: 'PROGRESS', sections: ['ONGOING_TASKS'] },
        { area: 'PRIORITY', sections: ['ONGOING_TASKS', 'FIRST_WEEK_CHECKLIST'] },
      ],
      statusPercent: { sufficient: 100, partial: 50, conflict: 25, missing: 0 },
    })
    expect(rubric.mock.calls[0]![0]).toBe(`${BASE}/rubric`)
  })

  it('starts a fix for several areas, saves answers, generates once and discards', async () => {
    const started = stubFetch(jsonResponse({ ...fix, status: 'NEEDS_INPUT', unansweredCount: 1 }, 201))
    await expect(repository.startReadinessFix('handover-1', ['EXCEPTION', 'ACCESS'])).resolves.toMatchObject({
      id: 'fix-1',
      status: 'needs-input',
      unansweredCount: 1,
      areas: [{
        area: 'EXCEPTION',
        status: 'conflict',
        proposed: true,
        changeSummary: '‘업무 기준과 예외’에 환불 예외를 보탰어요',
        sections: [{ section: 'PURPOSE', label: '업무 개요' }],
        questions: [{ id: 'q-1', area: 'EXCEPTION', options: ['7일', '14일'], deferred: true, answer: '7일' }],
      }],
      sections: [{
        section: 'PURPOSE',
        changed: true,
        before: { section: 'PURPOSE', value: '운영이 멈추지 않게 합니다.' },
        after: { section: 'PURPOSE', value: '운영과 환불 예외가 멈추지 않게 합니다.' },
      }],
    })
    expect(started.mock.calls[0]![0]).toBe(`${BASE}/fixes`)
    expect(started.mock.calls[0]![1]?.method).toBe('POST')
    expect(bodyOf(started)).toEqual({ areas: ['EXCEPTION', 'ACCESS'] })

    const read = stubFetch(jsonResponse({ ...fix, stale: true }))
    await expect(repository.getReadinessFix('handover-1', 'fix-1')).resolves.toMatchObject({ stale: true })
    expect(read.mock.calls[0]![0]).toBe(`${BASE}/fixes/fix-1`)

    const answered = stubFetch(jsonResponse(fix))
    await repository.answerReadinessFix('handover-1', 'fix-1', [{ questionId: 'q-1', answer: '고객지원팀이 맡아요' }])
    expect(answered.mock.calls[0]![0]).toBe(`${BASE}/fixes/fix-1/answers`)
    expect(answered.mock.calls[0]![1]?.method).toBe('PUT')
    expect(bodyOf(answered)).toEqual({ answers: [{ questionId: 'q-1', answer: '고객지원팀이 맡아요' }] })

    const generated = stubFetch(jsonResponse({ ...fix, sections: [{ ...fix.sections[0], after: null, changed: false }] }))
    await expect(repository.generateReadinessFix('handover-1', 'fix-1')).resolves.toMatchObject({ sections: [{ after: null, changed: false }] })
    expect(generated.mock.calls[0]![0]).toBe(`${BASE}/fixes/fix-1/generate`)
    expect(generated.mock.calls[0]![1]?.method).toBe('POST')

    const discarded = stubFetch(jsonResponse({ ...fix, status: 'DISCARDED' }))
    await expect(repository.discardReadinessFix('handover-1', 'fix-1')).resolves.toMatchObject({ status: 'discarded' })
    expect(discarded.mock.calls[0]![0]).toBe(`${BASE}/fixes/fix-1/discard`)

    stubFetch(problem(409, 'READINESS_STALE'))
    await expect(repository.startReadinessFix('handover-1', ['EXCEPTION'])).rejects.toMatchObject({ serverCode: 'READINESS_STALE' })
  })

  it('applies a fix with the base revision and returns the new document and score', async () => {
    const applied = stubFetch(
      jsonResponse({
        fix: { ...fix, status: 'APPLIED', appliedRevision: 4 },
        document: draft(4, '운영과 환불 예외가 멈추지 않게 합니다.'),
        readiness: { ...readiness, score: 73, draftRevision: 4 },
      }),
      jsonResponse(handover),
    )

    await expect(repository.applyReadinessFix('handover-1', 'fix-1', 3)).resolves.toMatchObject({
      fix: { status: 'applied', appliedRevision: 4 },
      draft: { revision: 4, document: { title: '프로모션 운영', purpose: '운영과 환불 예외가 멈추지 않게 합니다.' } },
      readiness: { score: 73 },
    })
    expect(applied.mock.calls[0]![0]).toBe(`${BASE}/fixes/fix-1/apply`)
    expect(bodyOf(applied)).toEqual({ baseRevision: 3 })
    expect(applied.mock.calls[1]![0]).toBe(HANDOVER)

    stubFetch(jsonResponse({ fix: { ...fix, status: 'APPLIED' }, document: draft(4), readiness: null }), jsonResponse(handover))
    await expect(repository.applyReadinessFix('handover-1', 'fix-1', 3)).resolves.toMatchObject({ readiness: null })
  })
})
