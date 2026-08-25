import type { Handover, HandoverAttachment } from '@/entities/handover'

export interface CreateHandoverState {
  draftId: string | null
  recipientIds: string[]
  workItems: string[]
  attachments: HandoverAttachment[]
  interviewAnswers: Record<number, string>
  documentEdits: Record<string, string>
  confirmations: Record<string, string>
  submittedHandover: Handover | null
}

export type CreateHandoverAction =
  | { type: 'recipient/toggled'; recipientId: string }
  | { type: 'work/added' }
  | { type: 'work/changed'; index: number; value: string }
  | { type: 'work/removed'; index: number }
  | { type: 'attachments/loaded'; attachments: HandoverAttachment[] }
  | { type: 'attachment/added'; attachment: HandoverAttachment }
  | { type: 'attachment/removed'; attachmentId: string }
  | { type: 'draft/created'; draft: Handover }
  | { type: 'interview/answered'; step: number; answer: string }
  | { type: 'document/changed'; field: string; value: string }
  | { type: 'criterion/confirmed'; criterionId: string; value: string }
  | { type: 'submission/completed'; handover: Handover }
  | { type: 'reset' }

export function createInitialCreateHandoverState(): CreateHandoverState {
  return {
    draftId: null,
    recipientIds: ['user-jung-haneul'],
    workItems: ['프로모션 운영', '주문 현황 관리', '배송업체 협업'],
    attachments: [],
    interviewAnswers: {},
    documentEdits: {},
    confirmations: {},
    submittedHandover: null,
  }
}

export function createHandoverReducer(
  state: CreateHandoverState,
  action: CreateHandoverAction,
): CreateHandoverState {
  switch (action.type) {
    case 'recipient/toggled':
      return {
        ...state,
        recipientIds: state.recipientIds.includes(action.recipientId)
          ? state.recipientIds.filter((id) => id !== action.recipientId)
          : [...state.recipientIds, action.recipientId],
      }
    case 'work/added':
      return { ...state, workItems: [...state.workItems, ''] }
    case 'work/changed':
      return { ...state, workItems: state.workItems.map((value, index) => index === action.index ? action.value : value) }
    case 'work/removed':
      return state.workItems.length === 1
        ? state
        : { ...state, workItems: state.workItems.filter((_, index) => index !== action.index) }
    case 'attachments/loaded':
      return { ...state, attachments: structuredClone(action.attachments) }
    case 'attachment/added':
      return { ...state, attachments: [...state.attachments, action.attachment] }
    case 'attachment/removed':
      return { ...state, attachments: state.attachments.filter((file) => file.id !== action.attachmentId) }
    case 'draft/created':
      return { ...state, draftId: action.draft.id, attachments: structuredClone(action.draft.attachments) }
    case 'interview/answered':
      return { ...state, interviewAnswers: { ...state.interviewAnswers, [action.step]: action.answer } }
    case 'document/changed':
      return { ...state, documentEdits: { ...state.documentEdits, [action.field]: action.value } }
    case 'criterion/confirmed':
      return { ...state, confirmations: { ...state.confirmations, [action.criterionId]: action.value } }
    case 'submission/completed':
      return { ...state, submittedHandover: action.handover }
    case 'reset':
      return createInitialCreateHandoverState()
  }
}
