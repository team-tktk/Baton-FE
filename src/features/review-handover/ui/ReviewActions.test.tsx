import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getPrimaryHandover } from '@/test/handoverFactory'

import { ReviewActions } from './ReviewActions'

describe('ReviewActions', () => {
  it('rejects blank comments and submits trimmed text as data', async () => {
    const user = userEvent.setup()
    const onComment = vi.fn().mockResolvedValue(undefined)
    render(<ReviewActions handover={await getPrimaryHandover()} pending={false} onApprove={vi.fn()} onComment={onComment} onRevision={vi.fn()} />)
    expect(screen.getByRole('button', { name: '코멘트 남기기' })).toBeDisabled()
    await user.type(screen.getByLabelText('검토 코멘트'), '  <img src=x onerror=alert(1)>  ')
    await user.click(screen.getByRole('button', { name: '코멘트 남기기' }))
    expect(onComment).toHaveBeenCalledWith('<img src=x onerror=alert(1)>')
  })

  it('disables mutations while a request is pending', async () => {
    render(<ReviewActions handover={await getPrimaryHandover()} pending onApprove={vi.fn()} onComment={vi.fn()} onRevision={vi.fn()} />)
    expect(screen.getByRole('button', { name: '보완 요청' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '인수인계 승인' })).toBeDisabled()
  })
})
