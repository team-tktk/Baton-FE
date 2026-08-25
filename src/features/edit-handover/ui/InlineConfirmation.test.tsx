import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { HandoverCriterion } from '@/entities/handover'

import { InlineConfirmation } from './InlineConfirmation'

const criterion: HandoverCriterion = {
  id: 'coupon',
  title: '쿠폰 승인 순서',
  defaultText: '10%를 넘는 쿠폰은 누구에게 먼저 확인하나요?',
  options: ['마케팅 → 팀장', '팀장에게 바로'],
}

describe('InlineConfirmation', () => {
  it('opens the review dialog and confirms an option', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<InlineConfirmation criterion={criterion} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: '쿠폰 승인 순서 확인 필요' }))
    expect(screen.getByRole('dialog', { name: '쿠폰 승인 순서' })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '마케팅 → 팀장' }))
    expect(onConfirm).toHaveBeenCalledWith('coupon', '마케팅 → 팀장')
  })

  it('shows the resolved marker for a confirmed value', () => {
    render(<InlineConfirmation criterion={criterion} value="마케팅 → 팀장" onConfirm={vi.fn()} />)

    expect(screen.getByRole('button', { name: '쿠폰 승인 순서 확인 완료' })).toBeInTheDocument()
  })

  it('confirms a trimmed direct answer', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<InlineConfirmation criterion={criterion} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: '쿠폰 승인 순서 확인 필요' }))
    await user.type(screen.getByRole('textbox', { name: '직접 입력' }), '  예산 담당자 먼저  ')
    await user.click(screen.getByRole('button', { name: '직접 입력 확정' }))

    expect(onConfirm).toHaveBeenCalledWith('coupon', '예산 담당자 먼저')
  })
})
