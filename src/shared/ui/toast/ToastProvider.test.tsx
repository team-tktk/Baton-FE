import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { ToastProvider } from './ToastProvider'
import { useToast } from './useToast'

function ToastTrigger() {
  const { showToast } = useToast()
  return <button onClick={() => showToast('저장했어요')}>알림</button>
}

describe('ToastProvider', () => {
  it('announces a message requested by a child feature', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: '알림' }))

    expect(screen.getByRole('status')).toHaveTextContent('저장했어요')
  })
})
