import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { getPrimaryHandover } from '@/test/handoverFactory'

import { HandoverDraftEditor } from './HandoverDraftEditor'

describe('HandoverDraftEditor', () => {
  it('renders the DEMO document editor and emits nested edits', async () => {
    const handover = await getPrimaryHandover()
    const onFieldChange = vi.fn()
    render(<HandoverDraftEditor handover={handover} pending={false} returningFromComplete={false} onFeedback={vi.fn()} onFieldChange={onFieldChange} onSubmit={vi.fn()} />)

    expect(screen.getByText('AI 초안 · 확인 중')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '업무 개요' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '접근 권한과 계정' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '제출하기' })).toBeEnabled()

    const taskTitle = screen.getByLabelText(`${handover.document.activeTasks[0].title} 제목 편집`)
    taskTitle.textContent = '  수정한 업무 제목  '
    fireEvent.blur(taskTitle)
    expect(onFieldChange).toHaveBeenCalledWith(`task.${handover.document.activeTasks[0].id}.title`, '수정한 업무 제목')
  })

  it('keeps the on-screen label out of the saved next action', async () => {
    const handover = await getPrimaryHandover()
    const task = handover.document.activeTasks[0]
    const onFieldChange = vi.fn()
    render(<HandoverDraftEditor handover={handover} pending={false} returningFromComplete={false} onFeedback={vi.fn()} onFieldChange={onFieldChange} onSubmit={vi.fn()} />)

    const field = screen.getByLabelText(`${task.title} 다음 할 일 편집`)
    expect(field).toHaveTextContent(`다음 할 일: ${task.nextAction}`)
    fireEvent.blur(field)
    expect(onFieldChange).toHaveBeenCalledWith(`task.${task.id}.nextAction`, task.nextAction)
  })

  it('marks sections the readiness check flagged and leaves room for empty ones', async () => {
    const handover = await getPrimaryHandover()
    handover.document.accessAccounts = []
    render(<HandoverDraftEditor
      handover={handover}
      issues={{
        RULES_AND_EXCEPTIONS: [{ label: '예외 대응', status: 'partial', statusLabel: '일부 부족', anchorText: '쿠폰 할인율이 10%를 넘으면', evidenceName: '운영 매뉴얼.pdf' }],
        ACCESS_ACCOUNTS: [{ label: '접근 권한', status: 'missing', statusLabel: '누락', anchorText: null, evidenceName: null }],
      }}
      pending={false}
      returningFromComplete={false}
      onFeedback={vi.fn()}
      onFieldChange={vi.fn()}
      onSubmit={vi.fn()}
    />)

    const rules = document.getElementById('draft-section-rules-and-exceptions')!
    expect(rules).toHaveTextContent('준비도 · 예외 대응 일부 부족')
    expect(rules).toHaveTextContent('근거: 운영 매뉴얼.pdf')
    expect(screen.getByLabelText('쿠폰 할인 승인 순서 내용 편집')).toHaveAttribute('data-highlighted', 'true')
    expect(screen.getByLabelText('배송업체 회신 기준 내용 편집')).not.toHaveAttribute('data-highlighted')

    const access = document.getElementById('draft-section-access-accounts')!
    expect(access).toHaveTextContent('비어 있어요')
    expect(screen.queryByRole('heading', { name: '확인된 업무 기준' })).not.toBeInTheDocument()
  })

  it('disables submission while saving', async () => {
    const handover = await getPrimaryHandover()
    render(<HandoverDraftEditor handover={handover} pending returningFromComplete={false} onFeedback={vi.fn()} onFieldChange={vi.fn()} onSubmit={vi.fn()} />)

    expect(screen.getByRole('button', { name: '제출하기' })).toBeDisabled()
  })
})
