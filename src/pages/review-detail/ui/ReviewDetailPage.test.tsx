import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'
import { ToastProvider } from '@/shared/ui/toast'

import { ReviewDetailPage } from './ReviewDetailPage'

describe('ReviewDetailPage', () => {
  it('renders comments as text and approves through the repository', async () => {
    const user = userEvent.setup()
    const repository = new MockHandoverRepository()
    render(<HandoverRepositoryProvider repository={repository}><ToastProvider><MemoryRouter initialEntries={['/reviews/handover-moastore-operations']}><Routes><Route path="/reviews/:handoverId" element={<ReviewDetailPage />} /></Routes></MemoryRouter></ToastProvider></HandoverRepositoryProvider>)
    await user.type(await screen.findByLabelText('검토 코멘트'), '<script>alert(1)</script>')
    await user.click(screen.getByRole('button', { name: '코멘트 남기기' }))
    expect(await screen.findByText('<script>alert(1)</script>')).toBeInTheDocument()
    expect(document.querySelector('script')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '승인하기' }))
    expect(await screen.findByRole('status')).toHaveTextContent('인수인계를 승인했어요')
    expect((await repository.getHandover('handover-moastore-operations')).status).toBe('approved')
  })
})
