import type { DocumentSectionValue } from '@/entities/handover'

export interface SectionLine {
  primary: string
  secondary: string
  /** 비교 대상에 없던 줄(새로 보탠 내용) */
  added: boolean
}

/** 섹션 값을 읽기 좋은 줄 목록으로 바꾼다. 문자열 섹션은 한 줄이다. 형식이 섹션마다 달라 여기서 한 번에 푼다. */
function toLines({ section, value }: DocumentSectionValue): Array<Omit<SectionLine, 'added'>> {
  const join = (...parts: string[]) => parts.map((part) => part.trim()).filter(Boolean).join(' · ')
  switch (section) {
    case 'PURPOSE':
    case 'COMPLETION_CRITERIA':
      return value.trim() ? [{ primary: value, secondary: '' }] : []
    case 'FIRST_WEEK_CHECKLIST':
    case 'TOOLS':
      return value.filter((item) => item.trim()).map((item) => ({ primary: item, secondary: '' }))
    case 'RULES_AND_EXCEPTIONS':
      return value.map((item) => ({ primary: item.defaultText, secondary: '' }))
    case 'ONGOING_TASKS':
    case 'RECURRING_TASKS':
      return value.map((task) => ({
        primary: join(task.title, task.statusLabel),
        secondary: join(task.description, task.nextAction && `다음 할 일: ${task.nextAction}`, task.meta && `일정·담당: ${task.meta}`),
      }))
    case 'STAKEHOLDERS':
      return value.map((person) => ({ primary: join(person.name, person.team), secondary: person.responsibility }))
    case 'SCHEDULE':
      return value.map((row) => ({ primary: join(row.cycle, row.task), secondary: row.detail }))
    case 'ACCESS_ACCOUNTS':
      return value.map((row) => ({ primary: row.tool, secondary: join(row.permission, row.status) }))
    case 'CONFIRMED_CRITERIA':
      return value.map((row) => ({ primary: row.label, secondary: row.value }))
  }
}

export function describeSection(value: DocumentSectionValue, compareTo?: DocumentSectionValue | null): SectionLine[] {
  const before = new Set(compareTo ? toLines(compareTo).map((line) => `${line.primary}\n${line.secondary}`) : [])
  return toLines(value).map((line) => ({ ...line, added: Boolean(compareTo) && !before.has(`${line.primary}\n${line.secondary}`) }))
}
