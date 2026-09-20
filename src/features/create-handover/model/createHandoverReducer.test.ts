import { describe, expect, it } from 'vitest'

import type { HandoverAttachment } from '@/entities/handover'

import { createHandoverReducer, createInitialCreateHandoverState } from './createHandoverReducer'

const attachment: HandoverAttachment = {
  id: 'attachment-1',
  name: '가을_할인전_준비_메모.docx',
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  size: 2_400_000,
  status: 'ready',
}

describe('createHandoverReducer', () => {
  it('clears document edits once they are saved', () => {
    const edited = createHandoverReducer(createInitialCreateHandoverState(), { type: 'document/changed', field: 'purpose', value: '새 목적' })
    expect(edited.documentEdits).toEqual({ purpose: '새 목적' })
    expect(createHandoverReducer(edited, { type: 'document/reset' }).documentEdits).toEqual({})
  })

  it('keeps edits made while a save was in flight', () => {
    let state = createHandoverReducer(createInitialCreateHandoverState(), { type: 'document/changed', field: 'purpose', value: '저장한 목적' })
    const saved = state.documentEdits
    state = createHandoverReducer(state, { type: 'document/changed', field: 'scope', value: '저장 중에 고친 범위' })
    state = createHandoverReducer(state, { type: 'document/changed', field: 'purpose', value: '저장 중에 다시 고친 목적' })

    expect(createHandoverReducer(state, { type: 'document/saved', edits: saved }).documentEdits).toEqual({
      scope: '저장 중에 고친 범위',
      purpose: '저장 중에 다시 고친 목적',
    })
  })

  it('starts empty so nothing demo-shaped reaches the server', () => {
    const state = createInitialCreateHandoverState()

    expect(state.recipientIds).toEqual([])
    expect(state.reviewerIds).toEqual([])
    expect(state.workItems).toEqual([''])
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

  it('keeps an uploading file visible until the server returns its real attachment', () => {
    const uploading: HandoverAttachment = {
      id: 'uploading-123',
      name: '신규_운영_메모.pdf',
      mimeType: 'application/pdf',
      size: 1_200,
      status: 'processing',
    }
    const pending = createHandoverReducer(createInitialCreateHandoverState(), { type: 'attachment/added', attachment: uploading })
    const refreshedBeforeCompletion = createHandoverReducer(pending, { type: 'attachments/loaded', attachments: [] })
    const uploaded: HandoverAttachment = { ...uploading, id: 'attachment-2', status: 'ready' }
    const refreshedAfterCompletion = createHandoverReducer(refreshedBeforeCompletion, { type: 'attachments/loaded', attachments: [uploaded] })

    expect(refreshedBeforeCompletion.attachments).toEqual([uploading])
    expect(refreshedAfterCompletion.attachments).toEqual([uploaded])
  })
})
