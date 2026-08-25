import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { InterviewQuestion } from '@/entities/handover'

import { InterviewWizard } from './InterviewWizard'

const question: InterviewQuestion = {
  id: 'question-1',
  question: '가장 먼저 확인할 것은 무엇인가요?',
  help: '실제 기준을 확인하고 싶어요.',
  options: [{ label: '주문 오류', description: '결제 상태를 확인해요.' }],
  status: 'pending',
  answer: null,
}

describe('InterviewWizard', () => {
  it('submits a selected option', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<InterviewWizard answer="" currentStep={1} question={question} total={3} onBack={vi.fn()} onSkip={vi.fn()} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('radio', { name: /주문 오류/ }))
    await user.click(screen.getByRole('button', { name: '다음 질문' }))

    expect(onSubmit).toHaveBeenCalledWith('주문 오류')
  })

  it('submits a trimmed direct answer with Enter', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<InterviewWizard answer="" currentStep={3} question={question} total={3} onBack={vi.fn()} onSkip={vi.fn()} onSubmit={onSubmit} />)

    await user.type(screen.getByRole('textbox', { name: '직접 답변' }), '  팀장 확인  {Enter}')

    expect(onSubmit).toHaveBeenCalledWith('팀장 확인')
  })
})
