import type { Handover, HandoverDocument } from '@/entities/handover'

export const editableDocumentFields = ['scope', 'purpose', 'completionStandard'] as const
export type EditableDocumentField = typeof editableDocumentFields[number]

export function mergeDocumentChanges(
  handover: Handover,
  edits: Record<string, string>,
  confirmations: Record<string, string>,
): Handover {
  const document = structuredClone(handover.document)
  for (const field of editableDocumentFields) {
    if (edits[field] !== undefined) document[field] = edits[field]
  }
  document.criteria = document.criteria.map((criterion) => ({
    ...criterion,
    confirmedValue: confirmations[criterion.id] ?? criterion.confirmedValue,
  }))
  return { ...structuredClone(handover), document: document as HandoverDocument }
}
