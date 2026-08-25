import { createRef } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '../model/AuthProvider'
import { AuthModal } from './AuthModal'

const authenticatedUser = {
  createdAt: '2026-08-25T12:00:00Z',
  email: 'haneul@moastore.co.kr',
  id: 'f22d04eb-e4f9-4899-953a-86ad86f00dd3',
  name: '정하늘',
  position: '매니저',
  team: '운영팀',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}

function renderModal(onClose = vi.fn(), onSignup = vi.fn(), initialEmail = '') {
  render(
    <AuthProvider>
      <AuthModal initialEmail={initialEmail} open returnFocusRef={createRef<HTMLElement>()} onClose={onClose} onSignup={onSignup} />
    </AuthProvider>,
  )
  return { onClose, onSignup }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AuthModal', () => {
  it('prefills the email supplied by a completed signup', () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, 401)))

    renderModal(vi.fn(), vi.fn(), authenticatedUser.email)

    expect(screen.getByRole('textbox', { name: '회사 이메일' })).toHaveValue(authenticatedUser.email)
  })

  it('starts with empty credentials and closes only after a successful login', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(jsonResponse(authenticatedUser))
    vi.stubGlobal('fetch', fetchSpy)
    const { onClose } = renderModal()
    const email = screen.getByRole('textbox', { name: '회사 이메일' })
    const password = screen.getByLabelText('비밀번호')

    expect(email).toHaveValue('')
    expect(password).toHaveValue('')
    await user.type(email, authenticatedUser.email)
    await user.type(password, 'secret')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('keeps the modal open, clears the password, and explains rejected credentials', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401)))
    const { onClose } = renderModal()

    await user.type(screen.getByRole('textbox', { name: '회사 이메일' }), 'wrong@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'wrong')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('이메일 또는 비밀번호를 확인해 주세요.')
    expect(screen.getByLabelText('비밀번호')).toHaveValue('')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows a pending state while the login request is running', async () => {
    const user = userEvent.setup()
    let resolveLogin!: (response: Response) => void
    const pendingLogin = new Promise<Response>((resolve) => { resolveLogin = resolve })
    vi.stubGlobal('fetch', vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401))
      .mockReturnValueOnce(pendingLogin))
    renderModal()

    await user.type(screen.getByRole('textbox', { name: '회사 이메일' }), authenticatedUser.email)
    await user.type(screen.getByLabelText('비밀번호'), 'secret')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(screen.getByRole('button', { name: '로그인 중…' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: '회사 이메일' })).toBeDisabled()
    resolveLogin(jsonResponse(authenticatedUser))
  })
})
