import { describe, expect, it } from 'vitest'

import { getPrimaryHandover } from '@/test/handoverFactory'

import { buildHandoverMarkdown, handoverMarkdownFilename } from './buildHandoverMarkdown'

describe('buildHandoverMarkdown', () => {
  it('builds the Korean handover sections in a deterministic order', async () => {
    const markdown = buildHandoverMarkdown(await getPrimaryHandover())

    expect(markdown.indexOf('## 인계 범위')).toBeLessThan(markdown.indexOf('## 진행 중인 업무'))
    expect(markdown.indexOf('## 진행 중인 업무')).toBeLessThan(markdown.indexOf('## 확인된 업무 기준'))
    expect(markdown).toContain('- [ ] 진행 중인 행사 일정과 남은 요청 확인')
    expect(markdown).toContain('## 첨부 자료')
  })

  it('uses the agreed Korean UTF-8 download filename', () => {
    expect(handoverMarkdownFilename).toBe('모아스토어_운영팀_업무_인수인계.md')
  })
})
