import { describe, expect, it } from 'vitest'

import type { HandoverDocument, ReadinessFix } from '@/entities/handover'

import { buildSelectedFixDocument, getFixPreviewItems } from './fixPreview'

const document: HandoverDocument = {
  title: '업무 인수인계',
  intro: '',
  scope: '',
  purpose: '기존 목적',
  completionStandard: '',
  statusLabel: '',
  updatedAtLabel: '',
  activeTasks: [],
  recurringTasks: [],
  criteria: [],
  people: [],
  tools: [],
  checklist: ['기존 확인'],
  schedule: [],
  accessAccounts: [],
  confirmedCriteria: [],
}

const fix: ReadinessFix = {
  id: 'fix-1',
  status: 'proposed',
  baseRevision: 1,
  stale: false,
  appliedRevision: null,
  unansweredCount: 0,
  areas: [],
  sections: [{
    section: 'FIRST_WEEK_CHECKLIST',
    label: '첫 주 체크리스트',
    before: { section: 'FIRST_WEEK_CHECKLIST', value: ['기존 확인'] },
    after: { section: 'FIRST_WEEK_CHECKLIST', value: ['기존 확인', '새 확인 1', '새 확인 2'] },
    changed: true,
  }],
}

describe('fixPreview', () => {
  it('shows only newly proposed lines', () => {
    expect(getFixPreviewItems(fix).map((item) => item.primary)).toEqual(['새 확인 1', '새 확인 2'])
  })

  it('keeps existing content and applies only selected proposals', () => {
    const result = buildSelectedFixDocument(document, fix, new Set(['FIRST_WEEK_CHECKLIST:1']))

    expect(result.checklist).toEqual(['기존 확인', '새 확인 1'])
  })
})
