import { describe, expect, it } from 'vitest'

import { describeSection } from './sectionLines'

describe('describeSection', () => {
  it('reads each section shape as lines', () => {
    expect(describeSection({ section: 'PURPOSE', value: '운영이 멈추지 않게 합니다.' })).toEqual([{ primary: '운영이 멈추지 않게 합니다.', secondary: '', added: false }])
    expect(describeSection({ section: 'PURPOSE', value: '  ' })).toEqual([])
    expect(describeSection({ section: 'SCHEDULE', value: [{ cycle: '매주', task: '현황 공유', detail: '화요일 오전' }] })).toEqual([
      { primary: '매주 · 현황 공유', secondary: '화요일 오전', added: false },
    ])
    expect(describeSection({ section: 'ONGOING_TASKS', value: [{ id: 't-0', title: '할인전 준비', statusLabel: '진행 중', tone: 'blue', description: '쿠폰 범위', nextAction: '범위 확정', meta: '' }] })).toEqual([
      { primary: '할인전 준비 · 진행 중', secondary: '쿠폰 범위 · 다음 할 일: 범위 확정', added: false },
    ])
  })

  it('marks only lines the proposal adds', () => {
    const before = { section: 'ACCESS_ACCOUNTS' as const, value: [{ tool: '운영 어드민', permission: '조회', status: '사용 가능' }] }
    const after = { section: 'ACCESS_ACCOUNTS' as const, value: [...before.value, { tool: '정산 시스템', permission: '', status: '신청 필요' }] }

    expect(describeSection(after, before).map((line) => [line.primary, line.added])).toEqual([['운영 어드민', false], ['정산 시스템', true]])
    expect(describeSection({ section: 'PURPOSE', value: '새 목적' }, { section: 'PURPOSE', value: '옛 목적' })[0]?.added).toBe(true)
  })
})
