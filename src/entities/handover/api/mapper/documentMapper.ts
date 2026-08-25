import type {
  HandoverDocument,
  HandoverTask,
} from '../../model/types'
import type { HandoverDraftContent, TaskItemDto } from '../dto/types'

/** 서버 status 문구는 자유 문자열이라, 뱃지 색만 대표적인 표현으로 추정한다. */
function toneFor(status: string): HandoverTask['tone'] {
  if (/대기|보류|확인/.test(status)) return 'yellow'
  if (/반복|정기|매주|매월|매일/.test(status)) return 'green'
  if (/완료/.test(status)) return 'violet'
  return 'blue'
}

function toTask(task: TaskItemDto, prefix: string, index: number): HandoverTask {
  const statusLabel = task.status?.trim() || '진행 중'
  return {
    id: `${prefix}-${index}`,
    title: task.title?.trim() || '제목 없는 업무',
    statusLabel,
    tone: toneFor(statusLabel),
    description: task.description?.trim() || '',
    nextAction: task.nextAction?.trim() || '',
    meta: task.schedule?.trim() || '',
  }
}

interface DocumentMeta {
  title: string
  intro: string
  scope: string
  statusLabel: string
  updatedAtLabel: string
}

export function toHandoverDocument(content: HandoverDraftContent, meta: DocumentMeta): HandoverDocument {
  return {
    ...meta,
    purpose: content.purpose?.trim() || '',
    completionStandard: content.completionCriteria?.trim() || '',
    activeTasks: (content.ongoingTasks ?? []).map((task, index) => toTask(task, 'ongoing', index)),
    recurringTasks: (content.recurringTasks ?? []).map((task, index) => toTask(task, 'recurring', index)),
    criteria: (content.rulesAndExceptions ?? []).map((rule, index) => ({
      id: `rule-${index}`,
      title: `업무 기준 ${index + 1}`,
      defaultText: rule,
      options: [],
    })),
    people: (content.stakeholders ?? []).map((person, index) => ({
      id: `stakeholder-${index}`,
      name: person.name?.trim() || '이름 미상',
      team: person.team?.trim() || '',
      responsibility: person.helpWith?.trim() || '',
    })),
    tools: (content.tools ?? []).map((tool) => [tool.name?.trim(), tool.description?.trim()].filter(Boolean).join(' — ')),
    checklist: content.firstWeekChecklist ?? [],
    schedule: (content.schedule ?? []).map((row) => ({
      cycle: row.cycle?.trim() || '',
      task: row.task?.trim() || '',
      detail: row.detail?.trim() || '',
    })),
    accessAccounts: (content.accessAccounts ?? []).map((row) => ({
      tool: row.tool?.trim() || '',
      permission: row.permission?.trim() || '',
      status: row.status?.trim() || '',
    })),
    confirmedCriteria: (content.confirmedCriteria ?? []).map((item) => ({
      label: item.label?.trim() || '',
      value: item.value?.trim() || '',
    })),
  }
}

/** 저장은 content 전체 교체라, 화면 모델을 서버 구조로 되돌려 보낸다. */
export function toDraftContent(document: HandoverDocument): HandoverDraftContent {
  const fromTask = (task: HandoverTask) => ({
    title: task.title,
    status: task.statusLabel,
    description: task.description,
    nextAction: task.nextAction,
    schedule: task.meta,
  })
  return {
    purpose: document.purpose,
    completionCriteria: document.completionStandard,
    ongoingTasks: document.activeTasks.map(fromTask),
    recurringTasks: document.recurringTasks.map(fromTask),
    rulesAndExceptions: document.criteria.map((criterion) => criterion.defaultText),
    stakeholders: document.people.map((person) => ({ name: person.name, team: person.team, helpWith: person.responsibility })),
    tools: document.tools.map((tool) => {
      const [name, description = ''] = tool.split(' — ')
      return { name, description }
    }),
    schedule: document.schedule,
    accessAccounts: document.accessAccounts,
    firstWeekChecklist: document.checklist,
    confirmedCriteria: document.confirmedCriteria,
  }
}
