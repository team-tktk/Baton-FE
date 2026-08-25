import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SignupModal } from './SignupModal'

const signupUser = {
  createdAt: '2026-08-25T12:00:00Z',
  email: 'new-user@moastore.co.kr',
  id: 'f22d04eb-e4f9-4899-953a-86ad86f00dd3',
  name: '김민준',
  position: '매니저',
  team: '상품팀',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}

function renderModal(onSuccess = vi.fn(), onLogin = vi.fn()) {
  render(
    <SignupModal
      open
      returnFocusRef={createRef<HTMLElement>()}
      onClose={vi.fn()}
      onLogin={onLogin}
      onSuccess={onSuccess}
    />,
  )
  return { onLogin, onSuccess }
}

async function fillForm(password = 'password123') {
  const user = userEvent.setup()
  await user.type(screen.getByRole('textbox', { name: '이름' }), signupUser.name)
  await user.type(screen.getByRole('textbox', { name: '회사 이메일' }), signupUser.email)
  await user.type(screen.getByRole('textbox', { name: '팀' }), signupUser.team)
  await user.type(screen.getByRole('textbox', { name: '직책' }), signupUser.position)
  await user.type(screen.getByLabelText('비밀번호'), password)
  return user
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SignupModal', () => {
  it('passes the registered email to the login transition after signup', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(signupUser, 201)))
    const { onSuccess } = renderModal()
    const user = await fillForm()

    await user.click(screen.getByRole('button', { name: '회원가입하기' }))

    expect(onSuccess).toHaveBeenCalledWith(signupUser.email)
    expect(screen.getByLabelText('비밀번호')).toHaveValue('')
  })

  it('rejects a password shorter than eight characters without calling the API', async () => {
    const fetchSpy = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchSpy)
    renderModal()
    const user = await fillForm('short')

    await user.click(screen.getByRole('button', { name: '회원가입하기' }))

    expect(screen.getByRole('alert')).toHaveTextContent('비밀번호는 8자 이상 64자 이하로 입력해 주세요.')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('keeps the form open and explains a duplicate email response', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ message: 'Conflict' }, 409)))
    const { onSuccess } = renderModal()
    const user = await fillForm()

    await user.click(screen.getByRole('button', { name: '회원가입하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('이미 가입된 이메일이에요.')
    expect(screen.getByLabelText('비밀번호')).toHaveValue('')
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('switches back to login without submitting the form', async () => {
    const { onLogin } = renderModal()

    await userEvent.setup().click(screen.getByRole('button', { name: '로그인' }))

    expect(onLogin).toHaveBeenCalledOnce()
  })
})
