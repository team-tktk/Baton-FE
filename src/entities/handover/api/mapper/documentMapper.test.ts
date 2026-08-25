import { describe, expect, it } from 'vitest'

import { toDraftContent, toHandoverDocument } from './documentMapper'

const meta = { title: '제목', intro: '소개', scope: '범위', statusLabel: '상태', updatedAtLabel: '2026. 08. 26.' }

describe('documentMapper', () => {
  it('keeps a tool description that contains the separator', () => {
    const document = toHandoverDocument({
      tools: [{ name: '주간 현황 양식.xlsx', description: '주문 기록 — 반품 포함' }],
    }, meta)

    expect(document.tools).toEqual(['주간 현황 양식.xlsx — 주문 기록 — 반품 포함'])
    expect(toDraftContent(document).tools).toEqual([
      { name: '주간 현황 양식.xlsx', description: '주문 기록 — 반품 포함' },
    ])
  })

  it('treats a tool without a separator as a name only', () => {
    const document = toHandoverDocument({ tools: [{ name: '운영 어드민' }] }, meta)

    expect(toDraftContent(document).tools).toEqual([{ name: '운영 어드민', description: '' }])
  })

  it('maps the backend draft fields onto the document model', () => {
    const document = toHandoverDocument({
      purpose: '목적',
      completionCriteria: '완료 기준',
      ongoingTasks: [{ title: '심사', status: '서류 대기', description: '설명', nextAction: '회신 대기', schedule: '2026-08-29' }],
      stakeholders: [{ name: '정유미', team: '법무팀', helpWith: '계약서 검토' }],
      firstWeekChecklist: ['첫 항목'],
    }, meta)

    expect(document.completionStandard).toBe('완료 기준')
    expect(document.activeTasks[0]).toMatchObject({ title: '심사', statusLabel: '서류 대기', meta: '2026-08-29', tone: 'yellow' })
    expect(document.people[0]).toMatchObject({ name: '정유미', team: '법무팀', responsibility: '계약서 검토' })
    expect(document.checklist).toEqual(['첫 항목'])
  })
})
