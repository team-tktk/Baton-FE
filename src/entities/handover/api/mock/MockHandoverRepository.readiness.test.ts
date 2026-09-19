// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { MockHandoverRepository } from './MockHandoverRepository'

const ID = 'handover-moastore-operations'

describe('MockHandoverRepository readiness', () => {
  it('scores the draft like the server and reuses the result until the document changes', async () => {
    const repository = new MockHandoverRepository()
    await expect(repository.getReadiness(ID)).resolves.toBeNull()

    const first = await repository.evaluateReadiness(ID)
    expect(first).toMatchObject({ score: 75, potentialScore: 100, grade: 'needs-improvement', keyIssueCount: 3, stale: false })
    expect(first.areas.map((area) => area.area).slice(0, 3)).toEqual(['PROCEDURE', 'EXCEPTION', 'CONTACTS'])
    expect(first.areas.filter((area) => area.keyIssue)).toHaveLength(3)
    await expect(repository.evaluateReadiness(ID)).resolves.toEqual(first)

    const { document, revision } = await repository.getDocument(ID)
    await expect(repository.saveDocument(ID, { ...document, accessAccounts: [] }, revision)).resolves.toBe(revision + 1)
    await expect(repository.getReadiness(ID)).resolves.toMatchObject({ stale: true })
    await expect(repository.createReadinessFix(ID, 'EXCEPTION')).rejects.toMatchObject({ serverCode: 'READINESS_STALE' })

    const second = await repository.evaluateReadiness(ID)
    expect(second.areas.find((area) => area.area === 'ACCESS')).toMatchObject({ status: 'missing', percent: 0, anchorText: null })
    expect(second.score).toBe(65)
  })

  it('rejects a save based on an old revision', async () => {
    const repository = new MockHandoverRepository()
    const { document, revision } = await repository.getDocument(ID)
    await repository.saveDocument(ID, document, revision)

    await expect(repository.saveDocument(ID, document, revision)).rejects.toMatchObject({ status: 409, serverCode: 'AI_DRAFT_REVISION_CONFLICT' })
  })

  it('asks for input on an empty section, then applies the answer and rescores', async () => {
    const repository = new MockHandoverRepository()
    const { document, revision } = await repository.getDocument(ID)
    const saved = await repository.saveDocument(ID, { ...document, accessAccounts: [] }, revision)
    await repository.evaluateReadiness(ID)

    const asked = await repository.createReadinessFix(ID, 'ACCESS')
    expect(asked).toMatchObject({ status: 'needs-input', after: null, before: { section: 'ACCESS_ACCOUNTS', value: [] } })
    await expect(repository.applyReadinessFix(ID, asked.id, saved)).rejects.toMatchObject({ serverCode: 'READINESS_FIX_INVALID_STATE' })

    const proposed = await repository.answerReadinessFix(ID, asked.id, [{ questionId: 'q-1', answer: '운영 어드민' }])
    expect(proposed).toMatchObject({ status: 'proposed', after: { section: 'ACCESS_ACCOUNTS', value: [{ tool: '운영 어드민' }] } })

    await expect(repository.applyReadinessFix(ID, asked.id, saved - 1)).rejects.toMatchObject({ serverCode: 'AI_DRAFT_REVISION_CONFLICT' })
    const applied = await repository.applyReadinessFix(ID, asked.id, saved)
    expect(applied.fix).toMatchObject({ status: 'applied', appliedRevision: saved + 1 })
    expect(applied.draft).toMatchObject({ revision: saved + 1, document: { accessAccounts: [{ tool: '운영 어드민' }] } })
    expect(applied.readiness?.areas.find((area) => area.area === 'ACCESS')?.status).toBe('sufficient')
    await expect(repository.discardReadinessFix(ID, asked.id)).rejects.toMatchObject({ serverCode: 'READINESS_FIX_INVALID_STATE' })
  })

  it('proposes an addition for a weak section and leaves the document alone until applied', async () => {
    const repository = new MockHandoverRepository()
    await repository.evaluateReadiness(ID)
    const before = (await repository.getDocument(ID)).document.criteria

    const fix = await repository.createReadinessFix(ID, 'EXCEPTION')
    expect(fix.status).toBe('proposed')
    expect(fix.after?.value).toHaveLength(before.length + 1)
    expect((await repository.getDocument(ID)).document.criteria).toEqual(before)

    await expect(repository.discardReadinessFix(ID, fix.id)).resolves.toMatchObject({ status: 'discarded' })
    await expect(repository.createReadinessFix(ID, 'COMPLETION')).rejects.toMatchObject({ serverCode: 'READINESS_ITEM_SUFFICIENT' })
    await expect(repository.getReadinessFix(ID, 'missing')).rejects.toMatchObject({ serverCode: 'READINESS_FIX_NOT_FOUND' })
  })
})
