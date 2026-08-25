import type { Handover, HandoverDocument } from '@/entities/handover'

export const editableDocumentFields = ['title', 'intro', 'scope', 'purpose', 'completionStandard'] as const
export type EditableDocumentField = typeof editableDocumentFields[number]

export function mergeDocumentChanges(handover: Handover, edits: Record<string, string>): Handover {
  const document = structuredClone(handover.document)
  for (const field of editableDocumentFields) {
    if (edits[field] !== undefined) document[field] = edits[field]
  }
  const taskFields = ['title', 'description', 'nextAction', 'meta'] as const
  document.activeTasks = document.activeTasks.map((task) => {
    const next = { ...task }
    for (const field of taskFields) {
      const value = edits[`task.${task.id}.${field}`]
      if (value !== undefined) next[field] = value
    }
    return next
  })
  document.recurringTasks = document.recurringTasks.map((task) => {
    const next = { ...task }
    for (const field of taskFields) {
      const value = edits[`task.${task.id}.${field}`]
      if (value !== undefined) next[field] = value
    }
    return next
  })
  document.criteria = document.criteria.map((criterion) => ({
    ...criterion,
    defaultText: edits[`criterion.${criterion.id}`] ?? criterion.defaultText,
  }))
  document.people = document.people.map((person) => ({
    ...person,
    responsibility: edits[`person.${person.id}.responsibility`] ?? person.responsibility,
  }))
  document.tools = document.tools.map((tool, index) => edits[`tool.${index}`] ?? tool)
  document.checklist = document.checklist.map((item, index) => edits[`checklist.${index}`] ?? item)
  return { ...structuredClone(handover), document: document as HandoverDocument }
}
