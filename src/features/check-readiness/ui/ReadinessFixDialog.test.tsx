import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { ReadinessAreaResult, ReadinessFix } from '@/entities/handover'

import type { FixSession } from '../model/useReadinessFix'
import { ReadinessFixDialog } from './ReadinessFixDialog'

const area: ReadinessAreaResult = {
  area: 'ACCESS', label: '접근 권한', criteria: '', weight: 10, status: 'missing', statusLabel: '누락', percent: 0, keyIssue: true,
  section: 'ACCESS_ACCOUNTS', sectionLabel: '접근 권한과 계정', anchorText: null, summary: '권한 신청 방법이 없어요', resolution: '', evidence: [],
}

const fix: ReadinessFix = {
  id: 'fix-1', area: 'ACCESS', areaLabel: '접근 권한', section: 'ACCESS_ACCOUNTS', sectionLabel: '접근 권한과 계정', status: 'proposed',
  baseRevision: 3, stale: false, appliedRevision: null,
  before: { section: 'ACCESS_ACCOUNTS', value: [{ tool: '운영 어드민', permission: '조회', status: '사용 가능' }] },
  after: { section: 'ACCESS_ACCOUNTS', value: [{ tool: '운영 어드민', permission: '조회', status: '사용 가능' }, { tool: '정산 시스템', permission: '조회', status: '신청 필요' }] },
  changeSummary: '정산 시스템 권한을 보탰어요', questions: [], evidence: [{ fileId: 'file-1', fileName: '운영 매뉴얼.pdf', locator: '3쪽' }],
}

const session = (overrides: Partial<FixSession>): FixSession => ({ area, phase: 'ready', fix, error: null, ...overrides })

function renderDialog(value: FixSession | null) {
  const handlers = { onAnswer: vi.fn(), onApply: vi.fn(), onClose: vi.fn(), onOpenEvidence: vi.fn() }
  const view = render(<ReadinessFixDialog session={value} {...handlers} />)
  return { ...handlers, rerender: (next: FixSession | null) => view.rerender(<ReadinessFixDialog session={next} {...handlers} />) }
}

describe('ReadinessFixDialog', () => {
  it('waits while the proposal is being made', () => {
    renderDialog(session({ phase: 'creating', fix: null }))

    expect(screen.getByRole('dialog', { name: '접근 권한 보완' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('AI가 자료를 찾아 보완안을 만들고 있어요')
  })

  it('compares before and after, marks the added line and applies', async () => {
    const user = userEvent.setup()
    const { onApply, onClose, onOpenEvidence } = renderDialog(session({}))

    expect(within(screen.getByRole('region', { name: '수정 전' })).queryByText('새로 추가')).not.toBeInTheDocument()
    const after = within(screen.getByRole('region', { name: '수정 후' }))
    expect(after.getAllByRole('listitem')).toHaveLength(2)
    expect(after.getByText('새로 추가').closest('li')).toHaveTextContent('정산 시스템')

    await user.click(screen.getByRole('button', { name: /운영 매뉴얼\.pdf/ }))
    expect(onOpenEvidence).toHaveBeenCalledWith(fix.evidence[0])
    await user.click(screen.getByRole('button', { name: '문서에 적용' }))
    expect(onApply).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('cannot apply a stale proposal or be closed while applying', async () => {
    const user = userEvent.setup()
    const { onClose, rerender } = renderDialog(session({ fix: { ...fix, stale: true } }))
    expect(screen.getByRole('button', { name: '문서에 적용' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('문서가 바뀌어 적용할 수 없어요')

    rerender(session({ phase: 'applying' }))
    expect(screen.getByRole('button', { name: '적용하는 중…' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('collects answers to the follow-up questions', async () => {
    const user = userEvent.setup()
    const asking: ReadinessFix = { ...fix, status: 'needs-input', after: null, questions: [
      { id: 'q-1', question: '정산 시스템 권한은 누가 주나요?', reason: '자료에 신청 방법이 없어요', answer: null },
      { id: 'q-2', question: '언제까지 받아야 하나요?', reason: '', answer: null },
    ] }
    const { onAnswer } = renderDialog(session({ fix: asking }))

    const submit = screen.getByRole('button', { name: '답변하고 수정안 받기' })
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText(/정산 시스템 권한은 누가 주나요/), '  재무팀 김하나님  ')
    await user.click(submit)
    expect(onAnswer).toHaveBeenCalledWith([{ questionId: 'q-1', answer: '재무팀 김하나님' }])
  })
})
