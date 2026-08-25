import { describe, expect, it } from 'vitest'

import { getPrimaryHandover } from '@/test/handoverFactory'

import { mergeDocumentChanges } from './documentFields'

describe('mergeDocumentChanges', () => {
  it('merges nested document edits without mutating the source', async () => {
    const source = await getPrimaryHandover()
    const task = source.document.activeTasks[0]
    const criterion = source.document.criteria[0]
    const person = source.document.people[0]
    const originalTitle = task.title

    const merged = mergeDocumentChanges(source, {
      title: '새 문서 제목',
      [`task.${task.id}.title`]: '수정한 업무',
      [`criterion.${criterion.id}`]: '수정한 기준',
      [`person.${person.id}.responsibility`]: '수정한 역할',
      'tool.0': '새 도구',
      'checklist.0': '새 체크 항목',
    }, { [criterion.id]: '확정 답변' })

    expect(merged.document.title).toBe('새 문서 제목')
    expect(merged.document.activeTasks[0].title).toBe('수정한 업무')
    expect(merged.document.criteria[0]).toMatchObject({ defaultText: '수정한 기준', confirmedValue: '확정 답변' })
    expect(merged.document.people[0].responsibility).toBe('수정한 역할')
    expect(merged.document.tools[0]).toBe('새 도구')
    expect(merged.document.checklist[0]).toBe('새 체크 항목')
    expect(source.document.activeTasks[0].title).toBe(originalTitle)
  })
})
