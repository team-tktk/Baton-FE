import type { DocumentSection, HandoverDocument, ReadinessFix, ReadinessSectionChange } from '@/entities/handover'

import { describeSection } from './sectionLines'

export interface FixPreviewItem {
  id: string
  section: DocumentSection
  sectionLabel: string
  primary: string
  secondary: string
}

const itemId = (section: DocumentSection, index: number) => `${section}:${index}`

export function getFixPreviewItems(fix: ReadinessFix): FixPreviewItem[] {
  return fix.sections.flatMap((change) => {
    if (!change.changed || !change.after) return []
    return describeSection(change.after, change.before).flatMap((line, index) => line.added ? [{
      id: itemId(change.section, index),
      section: change.section,
      sectionLabel: change.label,
      primary: line.primary,
      secondary: line.secondary,
    }] : [])
  })
}

function selectedIndexes(change: ReadinessSectionChange, selectedIds: ReadonlySet<string>) {
  if (!change.after) return new Set<number>()
  return new Set(describeSection(change.after, change.before)
    .map((line, index) => line.added && selectedIds.has(itemId(change.section, index)) ? index : -1)
    .filter((index) => index >= 0))
}

function appendSelected<T>(before: T[], after: T[], indexes: ReadonlySet<number>) {
  const seen = new Set(before.map((item) => JSON.stringify(item)))
  const additions = after.filter((item, index) => indexes.has(index) && !seen.has(JSON.stringify(item)))
  return [...before, ...additions]
}

/** 현재 문서에 사용자가 남긴 AI 제안만 합친다. 기존 내용은 항상 보존한다. */
export function buildSelectedFixDocument(document: HandoverDocument, fix: ReadinessFix, selectedIds: ReadonlySet<string>): HandoverDocument {
  return fix.sections.reduce<HandoverDocument>((current, change) => {
    if (!change.changed || !change.after) return current
    const indexes = selectedIndexes(change, selectedIds)
    const selected = indexes.has(0)
    const before = change.before
    const after = change.after

    switch (after.section) {
      case 'PURPOSE':
        return { ...current, purpose: selected ? after.value : before.section === 'PURPOSE' ? before.value : current.purpose }
      case 'COMPLETION_CRITERIA':
        return { ...current, completionStandard: selected ? after.value : before.section === 'COMPLETION_CRITERIA' ? before.value : current.completionStandard }
      case 'ONGOING_TASKS':
        return { ...current, activeTasks: appendSelected(before.section === 'ONGOING_TASKS' ? before.value : current.activeTasks, after.value, indexes) }
      case 'RECURRING_TASKS':
        return { ...current, recurringTasks: appendSelected(before.section === 'RECURRING_TASKS' ? before.value : current.recurringTasks, after.value, indexes) }
      case 'RULES_AND_EXCEPTIONS':
        return { ...current, criteria: appendSelected(before.section === 'RULES_AND_EXCEPTIONS' ? before.value : current.criteria, after.value, indexes) }
      case 'STAKEHOLDERS':
        return { ...current, people: appendSelected(before.section === 'STAKEHOLDERS' ? before.value : current.people, after.value, indexes) }
      case 'TOOLS':
        return { ...current, tools: appendSelected(before.section === 'TOOLS' ? before.value : current.tools, after.value, indexes) }
      case 'SCHEDULE':
        return { ...current, schedule: appendSelected(before.section === 'SCHEDULE' ? before.value : current.schedule, after.value, indexes) }
      case 'ACCESS_ACCOUNTS':
        return { ...current, accessAccounts: appendSelected(before.section === 'ACCESS_ACCOUNTS' ? before.value : current.accessAccounts, after.value, indexes) }
      case 'FIRST_WEEK_CHECKLIST':
        return { ...current, checklist: appendSelected(before.section === 'FIRST_WEEK_CHECKLIST' ? before.value : current.checklist, after.value, indexes) }
      case 'CONFIRMED_CRITERIA':
        return { ...current, confirmedCriteria: appendSelected(before.section === 'CONFIRMED_CRITERIA' ? before.value : current.confirmedCriteria, after.value, indexes) }
    }
  }, document)
}
