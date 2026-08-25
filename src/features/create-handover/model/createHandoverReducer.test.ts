import { describe, expect, it } from 'vitest'

import type { HandoverAttachment } from '@/entities/handover'

import { createHandoverReducer, createInitialCreateHandoverState } from './createHandoverReducer'

const attachment: HandoverAttachment = {
  id: 'attachment-1',
  name: '가을_할인전_준비_메모.docx',
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  size: 2_400_000,
}

describe('createHandoverReducer', () => {
  it('starts with the demo recipient and three work items', () => {
    const state = createInitialCreateHandoverState()

    expect(state.recipientIds).toEqual(['user-jung-haneul'])
    expect(state.workItems).toEqual(['프로모션 운영', '주문 현황 관리', '배송업체 협업'])
  })

  it('toggles recipients without duplicates', () => {
    const initial = createInitialCreateHandoverState()
    const added = createHandoverReducer(initial, { type: 'recipient/toggled', recipientId: 'user-kim-minjun' })
    const removed = createHandoverReducer(added, { type: 'recipient/toggled', recipientId: 'user-jung-haneul' })

    expect(added.recipientIds).toEqual(['user-jung-haneul', 'user-kim-minjun'])
    expect(removed.recipientIds).toEqual(['user-kim-minjun'])
  })

  it('never removes the final work row', () => {
    const initial = { ...createInitialCreateHandoverState(), workItems: ['하나'] }

    expect(createHandoverReducer(initial, { type: 'work/removed', index: 0 }).workItems).toEqual(['하나'])
  })

  it('adds and removes attachment metadata', () => {
    const loaded = createHandoverReducer(createInitialCreateHandoverState(), {
      type: 'attachments/loaded',
      attachments: [attachment],
    })
    const removed = createHandoverReducer(loaded, { type: 'attachment/removed', attachmentId: attachment.id })

    expect(loaded.attachments).toEqual([attachment])
    expect(removed.attachments).toEqual([])
  })
})
