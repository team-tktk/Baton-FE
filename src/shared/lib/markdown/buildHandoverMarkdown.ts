import type { Handover, HandoverTask } from '@/entities/handover'

export const handoverMarkdownFilename = '모아스토어_운영팀_업무_인수인계.md'

function taskLines(tasks: HandoverTask[]) {
  return tasks.flatMap((task) => [
    `### ${task.title} · ${task.statusLabel}`,
    task.description,
    `- 다음 할 일: ${task.nextAction}`,
    `- 일정/담당: ${task.meta}`,
    '',
  ])
}

export function buildHandoverMarkdown(handover: Handover): string {
  const { document } = handover
  return [
    `# ${handover.title}`,
    '',
    document.intro,
    '',
    `> ${document.statusLabel} · ${document.updatedAtLabel}`,
    '',
    '## 인계 범위',
    document.scope,
    '',
    '## 목적과 완료 기준',
    document.purpose,
    '',
    document.completionStandard,
    '',
    '## 진행 중인 업무',
    ...taskLines(document.activeTasks),
    '## 반복 업무',
    ...taskLines(document.recurringTasks),
    '## 확인된 업무 기준',
    ...document.criteria.map((criterion) => `- **${criterion.title}**: ${criterion.confirmedValue ?? criterion.defaultText}`),
    '',
    '## 함께 일하는 사람',
    ...document.people.map((person) => `- ${person.name} · ${person.team}: ${person.responsibility}`),
    '',
    '## 첨부 자료',
    ...handover.attachments.map((attachment) => `- ${attachment.name}`),
    '',
    '## 첫날 체크리스트',
    ...document.checklist.map((item) => `- [ ] ${item}`),
    '',
  ].join('\n')
}
