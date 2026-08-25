import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { primaryHandoverFixture } from '@/entities/handover/api/mock/fixtures/handovers'

import { ConfirmationPanel } from './ConfirmationPanel'

describe('ConfirmationPanel', () => {
  it('enables submission only after all three criteria are confirmed', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const { rerender } = render(
      <ConfirmationPanel confirmations={{}} criteria={primaryHandoverFixture.document.criteria} onConfirm={onConfirm} onSubmit={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: '인수인계 전달하기' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '마케팅 담당자 확인 후 운영 팀장 마지막 확인' }))
    expect(onConfirm).toHaveBeenCalledWith('coupon', '마케팅 담당자 확인 후 운영 팀장 마지막 확인')

    rerender(
      <ConfirmationPanel
        confirmations={{ coupon: '확인', delivery: '확인', report: '확인' }}
        criteria={primaryHandoverFixture.document.criteria}
        onConfirm={onConfirm}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: '인수인계 전달하기' })).toBeEnabled()
  })
})
