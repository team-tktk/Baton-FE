import { useRef, useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Modal } from './Modal'

function ModalHarness() {
  const [open, setOpen] = useState(false)
  const openerRef = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button ref={openerRef} type="button" onClick={() => setOpen(true)}>로그인</button>
      <Modal
        open={open}
        returnFocusRef={openerRef}
        title="다시 만나서 반가워요"
        onClose={() => setOpen(false)}
      >
        <label>
          회사 이메일
          <input autoFocus type="email" />
        </label>
      </Modal>
    </>
  )
}

describe('Modal', () => {
  it('closes on Escape and restores focus to the opener', async () => {
    const user = userEvent.setup()
    render(<ModalHarness />)
    const opener = screen.getByRole('button', { name: '로그인' })

    await user.click(opener)
    expect(screen.getByRole('textbox', { name: '회사 이메일' })).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(opener).toHaveFocus())
  })
})
