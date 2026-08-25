import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ChatComposer } from './ChatComposer'

describe('ChatComposer', () => {
  it('submits a trimmed question with Enter and clears the input', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(true)
    render(<ChatComposer pending={false} onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('AI에게 질문'), '  첫날 무엇부터 하나요?  {Enter}')
    expect(onSubmit).toHaveBeenCalledWith('첫날 무엇부터 하나요?')
    expect(screen.getByLabelText('AI에게 질문')).toHaveValue('')
  })
})
