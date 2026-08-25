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
  it('starts without preselected people and with three work items', () => {
    const state = createInitialCreateHandoverState()

    expect(state.recipientIds).toEqual([])
    expect(state.reviewerIds).toEqual([])
    expect(state.workItems).toEqual(['프로모션 운영', '주문 현황 관리', '배송업체 협업'])
  })

  it('toggles recipients without duplicates', () => {
    const initial = createInitialCreateHandoverState()
    const added = createHandoverReducer(initial, { type: 'recipient/toggled', recipientId: 'user-kim-minjun' })
    const readded = createHandoverReducer(added, { type: 'recipient/toggled', recipientId: 'user-kim-minjun' })

    expect(added.recipientIds).toEqual(['user-kim-minjun'])
    expect(readded.recipientIds).toEqual([])
  })

  it('toggles reviewers independently from recipients', () => {
    const initial = createInitialCreateHandoverState()
    const withRecipient = createHandoverReducer(initial, { type: 'recipient/toggled', recipientId: 'user-jung-haneul' })
    const withReviewer = createHandoverReducer(withRecipient, { type: 'reviewer/toggled', reviewerId: 'user-lee-dohyeon' })

    expect(withReviewer.recipientIds).toEqual(['user-jung-haneul'])
    expect(withReviewer.reviewerIds).toEqual(['user-lee-dohyeon'])
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
