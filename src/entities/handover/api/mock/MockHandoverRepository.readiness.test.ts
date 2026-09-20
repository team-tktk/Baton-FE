// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { MockHandoverRepository } from './MockHandoverRepository'

const ID = 'handover-moastore-operations'

describe('MockHandoverRepository readiness', () => {
  it('scores the draft like the server and reuses the result until the document changes', async () => {
    const repository = new MockHandoverRepository()
    await expect(repository.getReadiness(ID)).resolves.toBeNull()

    const first = await repository.evaluateReadiness(ID)
    expect(first).toMatchObject({ score: 75, grade: 'needs-improvement', keyIssueCount: 3, stale: false, deferredQuestionCount: 0 })
    expect(first.areas.map((area) => area.area).slice(0, 3)).toEqual(['PROCEDURE', 'EXCEPTION', 'CONTACTS'])
    expect(first.areas.find((area) => area.area === 'CONTACTS')).toMatchObject({
      targetSections: [{ section: 'STAKEHOLDERS', label: '주요 관계자' }],
      questions: [{ options: ['윤예린 · 마케팅팀', '오세진 · 물류팀'] }],
    })
    await expect(repository.evaluateReadiness(ID)).resolves.toEqual(first)

    const { document, revision } = await repository.getDocument(ID)
    await expect(repository.saveDocument(ID, { ...document, accessAccounts: [] }, revision)).resolves.toBe(revision + 1)
    await expect(repository.getReadiness(ID)).resolves.toMatchObject({ stale: true })
    await expect(repository.startReadinessFix(ID, ['EXCEPTION'])).rejects.toMatchObject({ serverCode: 'READINESS_STALE' })

    const second = await repository.evaluateReadiness(ID)
    expect(second.areas.find((area) => area.area === 'ACCESS')).toMatchObject({ status: 'missing', percent: 0, anchorText: null, questions: [{ options: [] }] })
    expect(second.score).toBe(65)
  })

  it('rejects a save based on an old revision', async () => {
    const repository = new MockHandoverRepository()
    const { document, revision } = await repository.getDocument(ID)
    await repository.saveDocument(ID, document, revision)

    await expect(repository.saveDocument(ID, document, revision)).rejects.toMatchObject({ status: 409, serverCode: 'AI_DRAFT_REVISION_CONFLICT' })
  })

  it('fixes several areas with one generation and leaves an unanswered conflict alone', async () => {
    const repository = new MockHandoverRepository()
    await repository.evaluateReadiness(ID)
    const before = (await repository.getDocument(ID)).document

    const started = await repository.startReadinessFix(ID, ['PROCEDURE', 'EXCEPTION', 'CONTACTS'])
    expect(started).toMatchObject({ status: 'needs-input', unansweredCount: 1 })
    expect(started.areas.map((area) => [area.area, area.questions.length])).toEqual([['PROCEDURE', 0], ['EXCEPTION', 0], ['CONTACTS', 1]])
    expect(started.sections.map((change) => [change.section, change.changed, change.after])).toEqual([
      ['RECURRING_TASKS', false, null], ['RULES_AND_EXCEPTIONS', false, null], ['STAKEHOLDERS', false, null],
    ])

    const generated = await repository.generateReadinessFix(ID, started.id)
    expect(generated.status).toBe('proposed')
    expect(generated.areas.map((area) => [area.area, area.proposed])).toEqual([['PROCEDURE', true], ['EXCEPTION', true], ['CONTACTS', false]])
    expect(generated.sections.filter((change) => change.changed).map((change) => change.section)).toEqual(['RECURRING_TASKS', 'RULES_AND_EXCEPTIONS'])
    expect((await repository.getDocument(ID)).document).toEqual(before)

    const applied = await repository.applyReadinessFix(ID, started.id, started.baseRevision)
    expect(applied.fix).toMatchObject({ status: 'applied', appliedRevision: started.baseRevision + 1 })
    expect(applied.draft.document.criteria).toHaveLength(before.criteria.length + 1)
    expect(applied.readiness?.areas.filter((area) => area.status !== 'sufficient').map((area) => area.area)).toEqual(['CONTACTS'])
  })

  it('needs an answer before filling an empty section or resolving a conflict', async () => {
    const repository = new MockHandoverRepository()
    const { document, revision } = await repository.getDocument(ID)
    const saved = await repository.saveDocument(ID, { ...document, accessAccounts: [] }, revision)
    await repository.evaluateReadiness(ID)

    const started = await repository.startReadinessFix(ID, ['ACCESS', 'CONTACTS'])
    const [accessQuestion, contactsQuestion] = started.areas.flatMap((area) => area.questions)
    await expect(repository.applyReadinessFix(ID, started.id, saved)).rejects.toMatchObject({ serverCode: 'READINESS_FIX_INVALID_STATE' })
    await expect(repository.generateReadinessFix(ID, started.id)).resolves.toMatchObject({ status: 'needs-input' })

    const answered = await repository.answerReadinessFix(ID, started.id, [
      { questionId: accessQuestion!.id, answer: '운영 어드민' },
      { questionId: contactsQuestion!.id, answer: '윤예린 · 마케팅팀' },
    ])
    expect(answered.unansweredCount).toBe(0)
    const generated = await repository.generateReadinessFix(ID, started.id)
    expect(generated.areas.every((area) => area.proposed)).toBe(true)
    expect(generated.sections.find((change) => change.section === 'ACCESS_ACCOUNTS')).toMatchObject({ changed: true, after: { value: [{ tool: '운영 어드민' }] } })

    await expect(repository.applyReadinessFix(ID, started.id, saved - 1)).rejects.toMatchObject({ serverCode: 'AI_DRAFT_REVISION_CONFLICT' })
    const applied = await repository.applyReadinessFix(ID, started.id, saved)
    expect(applied.readiness?.areas.find((area) => area.area === 'ACCESS')?.status).toBe('sufficient')
    await expect(repository.discardReadinessFix(ID, started.id)).rejects.toMatchObject({ serverCode: 'READINESS_FIX_INVALID_STATE' })
  })

  it('refuses sufficient areas and unknown fixes', async () => {
    const repository = new MockHandoverRepository()
    await repository.evaluateReadiness(ID)

    await expect(repository.startReadinessFix(ID, ['EXCEPTION', 'COMPLETION'])).rejects.toMatchObject({ serverCode: 'READINESS_ITEM_SUFFICIENT' })
    const started = await repository.startReadinessFix(ID, ['EXCEPTION'])
    await expect(repository.discardReadinessFix(ID, started.id)).resolves.toMatchObject({ status: 'discarded' })
    await expect(repository.getReadinessFix(ID, 'missing')).rejects.toMatchObject({ serverCode: 'READINESS_FIX_NOT_FOUND' })
  })
})
