import type { Handover, HandoverTask } from '@/entities/handover'

export const handoverMarkdownFilename = '모아스토어_운영팀_업무_인수인계.md'

function taskLines(tasks: HandoverTask[]) {
  // AI가 채우지 못한 항목은 라벨만 남으므로 줄 자체를 뺀다.
  return tasks.flatMap((task) => {
    const lines = [`### ${task.title} · ${task.statusLabel}`]
    if (task.description) lines.push(task.description)
    if (task.nextAction) lines.push(`- 다음 할 일: ${task.nextAction}`)
    if (task.meta) lines.push(`- 일정/담당: ${task.meta}`)
    lines.push('')
    return lines
  })
}

/** AI 초안은 비어 있는 섹션이 생길 수 있다. 제목만 남기지 않고 통째로 뺀다. */
function section(heading: string, lines: string[]) {
  return lines.length === 0 ? [] : [heading, ...lines, '']
}

/** 문서 상단 정보 블록. 값이 없는 줄은 넣지 않는다. */
function metaLines(handover: Handover) {
  const { document } = handover
  return [
    ['인계자', handover.owner.name],
    ['인수자', handover.recipients.map((person) => person.name).join(', ')],
    ['담당 업무', document.scope],
    ['참고 자료', handover.attachments.length > 0 ? `업로드 파일 ${handover.attachments.length}개` : ''],
    ['상태', document.statusLabel],
    ['업데이트', document.updatedAtLabel],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `- **${label}**: ${value}`)
}

export function buildHandoverMarkdown(handover: Handover): string {
  const { document } = handover
  return [
    `# ${document.title}`,
    '',
    document.intro,
    '',
    ...metaLines(handover),
    '',
    ...section('## 목적과 완료 기준', [document.purpose, '', document.completionStandard].filter((line, index) => index === 1 || line)),
    ...section('## 진행 중인 업무', taskLines(document.activeTasks)),
    ...section('## 반복 업무', taskLines(document.recurringTasks)),
    ...section('## 업무 기준과 예외', document.criteria.map((criterion) => `- ${criterion.confirmedValue ?? criterion.defaultText}`)),
    ...section('## 확인된 기준', document.confirmedCriteria.map((item) => `- **${item.label}**: ${item.value}`)),
    ...section('## 함께 일하는 사람', document.people.map((person) => `- ${person.name} · ${person.team}: ${person.responsibility}`)),
    ...section('## 업무 일정', document.schedule.map((row) => `- ${row.cycle} · ${row.task}: ${row.detail}`)),
    ...section('## 접근 권한과 계정', document.accessAccounts.map((row) => `- ${row.tool} · ${row.permission}: ${row.status}`)),
    ...section('## 첨부 자료', handover.attachments.map((attachment) => `- ${attachment.name}`)),
    ...section('## 첫날 체크리스트', document.checklist.map((item) => `- [ ] ${item}`)),
  ].join('\n')
}
