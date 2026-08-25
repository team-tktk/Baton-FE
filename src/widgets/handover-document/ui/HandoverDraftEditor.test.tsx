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

  it('disables submission while saving', async () => {
    const handover = await getPrimaryHandover()
    render(<HandoverDraftEditor handover={handover} pending returningFromComplete={false} onFeedback={vi.fn()} onFieldChange={vi.fn()} onSubmit={vi.fn()} />)

    expect(screen.getByRole('button', { name: '제출하기' })).toBeDisabled()
  })
})
