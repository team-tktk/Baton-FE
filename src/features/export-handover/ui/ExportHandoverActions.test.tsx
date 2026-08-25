import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getPrimaryHandover } from '@/test/handoverFactory'

import { ExportHandoverActions } from './ExportHandoverActions'

describe('ExportHandoverActions', () => {
  it('copies the document and reports completion', async () => {
    const user = userEvent.setup()
    const onFeedback = vi.fn()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    render(<ExportHandoverActions handover={await getPrimaryHandover()} onFeedback={onFeedback} />)

    await user.click(screen.getByRole('button', { name: 'Markdown 복사' }))

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('# 업무 인수인계'))
    expect(onFeedback).toHaveBeenCalledWith('Markdown을 클립보드에 복사했어요')
  })
})
