import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { ReadinessAreaResult, ReadinessFix, ReadinessFixArea } from '@/entities/handover'

import type { FixSession } from '../model/useReadinessFix'
import { ReadinessFixDialog } from './ReadinessFixDialog'

const areaResult = (area: ReadinessAreaResult['area'], label: string): ReadinessAreaResult => ({
  area, label, criteria: '', weight: 10, status: 'partial', statusLabel: '일부 부족', percent: 50, keyIssue: true,
  section: 'ACCESS_ACCOUNTS', sectionLabel: '접근 권한과 계정', targetSections: [{ section: 'ACCESS_ACCOUNTS', label: '접근 권한과 계정' }],
  anchorText: null, summary: '', resolution: '', evidence: [], questions: [], deferredQuestions: [],
})

const contacts: ReadinessFixArea = {
  area: 'CONTACTS', label: '담당자', status: 'conflict', statusLabel: '충돌', sections: [{ section: 'STAKEHOLDERS', label: '주요 관계자' }],
  proposed: false, changeSummary: '', evidence: [],
  questions: [{ id: 'q-1', area: 'CONTACTS', question: '쿠폰 예산 담당자는 누구인가요?', reason: '자료마다 달라요', options: ['윤예린', '오세진'], deferred: false, answer: null }],
}
const access: ReadinessFixArea = {
  area: 'ACCESS', label: '접근 권한', status: 'missing', statusLabel: '누락', sections: [{ section: 'ACCESS_ACCOUNTS', label: '접근 권한과 계정' }],
  proposed: false, changeSummary: '', evidence: [],
  questions: [{ id: 'q-2', area: 'ACCESS', question: '정산 시스템 권한은 누가 주나요?', reason: '', options: [], deferred: true, answer: null }],
}
const procedure: ReadinessFixArea = {
  area: 'PROCEDURE', label: '실행 절차', status: 'partial', statusLabel: '일부 부족', sections: [{ section: 'ACCESS_ACCOUNTS', label: '접근 권한과 계정' }],
  proposed: false, changeSummary: '', evidence: [], questions: [],
}

const started: ReadinessFix = {
  id: 'fix-1', status: 'needs-input', baseRevision: 3, stale: false, appliedRevision: null, unansweredCount: 2,
  areas: [contacts, access, procedure],
  sections: [{ section: 'ACCESS_ACCOUNTS', label: '접근 권한과 계정', before: { section: 'ACCESS_ACCOUNTS', value: [{ tool: '운영 어드민', permission: '조회', status: '사용 가능' }] }, after: null, changed: false }],
}

const generated: ReadinessFix = {
  ...started,
  status: 'proposed',
  areas: [
    { ...contacts, questions: [{ ...contacts.questions[0]!, id: 'q-3', question: '예산 승인 한도는 얼마인가요?', options: [] }] },
    { ...access, proposed: true, changeSummary: '정산 시스템 권한을 보탰어요', evidence: [{ fileId: 'file-1', fileName: '운영 매뉴얼.pdf', locator: '3쪽', page: 3, quote: '' }] },
    procedure,
  ],
  sections: [{
    ...started.sections[0]!,
    after: { section: 'ACCESS_ACCOUNTS', value: [{ tool: '운영 어드민', permission: '조회', status: '사용 가능' }, { tool: '정산 시스템', permission: '조회', status: '신청 필요' }] },
    changed: true,
  }],
}

const session = (overrides: Partial<FixSession>): FixSession => ({
  areas: [areaResult('CONTACTS', '담당자'), areaResult('ACCESS', '접근 권한'), areaResult('PROCEDURE', '실행 절차')],
  phase: 'ready', fix: started, error: null, ...overrides,
})

function renderDialog(value: FixSession | null) {
  const handlers = { onGenerate: vi.fn(), onApply: vi.fn(), onClose: vi.fn(), onOpenEvidence: vi.fn() }
  const view = render(<ReadinessFixDialog session={value} {...handlers} />)
  return { ...handlers, rerender: (next: FixSession | null) => view.rerender(<ReadinessFixDialog session={next} {...handlers} />) }
}

describe('ReadinessFixDialog', () => {
  it('waits while the questions are gathered and while the proposal is made', () => {
    const { rerender } = renderDialog(session({ phase: 'starting', fix: null }))
    expect(screen.getByRole('dialog', { name: '항목 3개 보완' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('보완할 내용을 정리하고 있어요')

    rerender(session({ phase: 'generating' }))
    expect(screen.getByRole('status')).toHaveTextContent('AI가 자료와 답변으로 수정안을 만들고 있어요')
    expect(screen.getByRole('button', { name: /AI로 수정안 만들기/ })).toBeDisabled()
  })

  it('collects answers per item, with choices for a conflict, and generates once', async () => {
    const user = userEvent.setup()
    const { onGenerate } = renderDialog(session({}))

    const contactsBlock = within(screen.getByRole('region', { name: '담당자 질문' }))
    expect(contactsBlock.getByText(/맞는 값을 골라야 이 항목을 고칠 수 있어요/)).toBeInTheDocument()
    await user.click(contactsBlock.getByRole('radio', { name: '윤예린' }))
    const accessBlock = within(screen.getByRole('region', { name: '접근 권한 질문' }))
    expect(accessBlock.getByText('나중에 답하기로 미룬 질문')).toBeInTheDocument()
    await user.type(accessBlock.getByRole('textbox', { name: /정산 시스템 권한은 누가 주나요/ }), '  재무팀 김하나님  ')
    expect(within(screen.getByRole('region', { name: '실행 절차 질문' })).getByText(/업로드한 자료에서 찾아 채워요/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /AI로 수정안 만들기/ }))
    expect(onGenerate).toHaveBeenCalledWith([{ questionId: 'q-1', answer: '윤예린' }, { questionId: 'q-2', answer: '재무팀 김하나님' }])
  })

  it('lets a choice be replaced by a written answer', async () => {
    const user = userEvent.setup()
    const { onGenerate } = renderDialog(session({}))
    const contactsBlock = within(screen.getByRole('region', { name: '담당자 질문' }))

    await user.click(contactsBlock.getByRole('radio', { name: '직접 입력' }))
    await user.type(contactsBlock.getByRole('textbox'), '둘 다 아니고 김도현')
    await user.click(screen.getByRole('button', { name: /AI로 수정안 만들기/ }))
    expect(onGenerate).toHaveBeenCalledWith([{ questionId: 'q-1', answer: '둘 다 아니고 김도현' }])
  })

  it('shows which items got a proposal, previews the fixed sections and applies', async () => {
    const user = userEvent.setup()
    const { onApply, onGenerate, onOpenEvidence } = renderDialog(session({ fix: generated }))

    expect(screen.getByText('항목 3개 중 1개의 수정안을 만들었어요. 확인하고 문서에 적용해 주세요.')).toBeInTheDocument()
    const changes = within(screen.getByRole('region', { name: '접근 권한과 계정 수정 후' }))
    expect(changes.getByText('새로 추가').closest('li')).toHaveTextContent('정산 시스템')
    // 수정 전은 더 이상 그리지 않는다. 달라진 곳은 줄마다 붙는 딱지로만 알린다.
    expect(screen.queryByRole('region', { name: '수정 전' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /운영 매뉴얼\.pdf/ }))
    expect(onOpenEvidence).toHaveBeenCalled()

    // 아직 부족한 항목에는 새 질문이 붙는다. 답해야 다시 만들 수 있다.
    const regenerate = screen.getByRole('button', { name: '답하고 다시 만들기' })
    expect(regenerate).toBeDisabled()
    await user.type(screen.getByRole('textbox', { name: /예산 승인 한도는 얼마인가요/ }), '50만 원')
    await user.click(regenerate)
    expect(onGenerate).toHaveBeenCalledWith([{ questionId: 'q-3', answer: '50만 원' }])

    await user.click(screen.getByRole('button', { name: '문서에 적용' }))
    expect(onApply).toHaveBeenCalled()
  })

  it('cannot apply a stale fix or be closed while applying', async () => {
    const user = userEvent.setup()
    const { onClose, rerender } = renderDialog(session({ fix: { ...generated, stale: true } }))
    expect(screen.getByRole('button', { name: '문서에 적용' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('문서가 바뀌어 적용할 수 없어요')

    rerender(session({ fix: generated, phase: 'applying' }))
    expect(screen.getByRole('button', { name: '적용하는 중…' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows a start failure with a way out', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog(session({ phase: 'error', fix: null, error: '이미 충분한 항목은 보완할 필요가 없습니다' }))
    expect(screen.getByRole('alert')).toHaveTextContent('이미 충분한 항목은')
    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalled()
  })
})
