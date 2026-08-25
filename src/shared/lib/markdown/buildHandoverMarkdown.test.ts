import { describe, expect, it } from 'vitest'

import { getPrimaryHandover } from '@/test/handoverFactory'

import { buildHandoverMarkdown, handoverMarkdownFilename } from './buildHandoverMarkdown'

describe('buildHandoverMarkdown', () => {
  it('builds the Korean handover sections in a deterministic order', async () => {
    const markdown = buildHandoverMarkdown(await getPrimaryHandover())

    expect(markdown.indexOf('- **인계자**:')).toBeLessThan(markdown.indexOf('## 진행 중인 업무'))
    expect(markdown.indexOf('## 진행 중인 업무')).toBeLessThan(markdown.indexOf('## 업무 기준과 예외'))
    expect(markdown).toContain('- [ ] 진행 중인 행사 일정과 남은 요청 확인')
    expect(markdown).toContain('## 첨부 자료')
  })

  it('repeats the on-screen summary block so the export is self-contained', async () => {
    const handover = await getPrimaryHandover()

    const markdown = buildHandoverMarkdown(handover)

    expect(markdown).toContain(`- **인계자**: ${handover.owner.name}`)
    expect(markdown).toContain(`- **인수자**: ${handover.recipients.map((person) => person.name).join(', ')}`)
    expect(markdown).toContain(`- **담당 업무**: ${handover.document.scope}`)
    expect(markdown).toContain('- **상태**: ')
    expect(markdown).toContain('- **업데이트**: ')
  })

  it('drops task lines the AI draft left empty instead of printing a bare label', async () => {
    const handover = await getPrimaryHandover()
    const stripped = { ...handover.document.activeTasks[0], meta: '', nextAction: '' }
    handover.document.activeTasks = [stripped]
    handover.document.recurringTasks = []

    const markdown = buildHandoverMarkdown(handover)

    expect(markdown).not.toContain('- 일정/담당:')
    expect(markdown).not.toContain('- 다음 할 일:')
    expect(markdown).toContain(`### ${stripped.title} · ${stripped.statusLabel}`)
  })

  it('drops sections the AI draft left empty instead of printing a bare heading', async () => {
    const handover = await getPrimaryHandover()
    handover.document.activeTasks = []
    handover.document.people = []

    const markdown = buildHandoverMarkdown(handover)

    expect(markdown).not.toContain('## 진행 중인 업무')
    expect(markdown).not.toContain('## 함께 일하는 사람')
    expect(markdown).toContain('## 반복 업무')
  })

  it('uses the agreed Korean UTF-8 download filename', () => {
    expect(handoverMarkdownFilename).toBe('모아스토어_운영팀_업무_인수인계.md')
  })
})
