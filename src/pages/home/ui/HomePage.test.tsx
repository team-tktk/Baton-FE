import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { DemoAuthProvider } from '@/features/demo-auth'
import { ToastProvider } from '@/shared/ui/toast'

import { HomePage } from './HomePage'

function renderHome() {
  const router = createMemoryRouter([
    { path: '/', element: <HomePage /> },
    { path: '/handovers/new/setup', element: <p>전임자 시작</p> },
    { path: '/handovers/received', element: <p>후임자 목록</p> },
    { path: '/reviews', element: <p>팀장 검토</p> },
  ])
  render(
    <DemoAuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </DemoAuthProvider>,
  )
  return router
}

describe('HomePage', () => {
  it.each([
    ['인수인계 하기', '/handovers/new/setup'],
    ['인수인계 받기', '/handovers/received'],
    ['인수인계 확인하기', '/reviews'],
  ])('navigates %s to its role start route', async (name, pathname) => {
    const user = userEvent.setup()
    const router = renderHome()

    await user.click(screen.getByRole('button', { name: new RegExp(name) }))

    expect(router.state.location.pathname).toBe(pathname)
  })

  it('signs up and exposes the demo profile menu', async () => {
    const user = userEvent.setup()
    renderHome()

    await user.click(screen.getByRole('button', { name: '회원가입' }))
    await user.clear(screen.getByRole('textbox', { name: '이름' }))
    await user.type(screen.getByRole('textbox', { name: '이름' }), '김민준')
    await user.clear(screen.getByRole('textbox', { name: '회사 이메일' }))
    await user.type(screen.getByRole('textbox', { name: '회사 이메일' }), 'minjun@moastore.co.kr')
    await user.click(screen.getByRole('button', { name: '회원가입하기' }))
    await user.click(screen.getByRole('button', { name: /김민준/ }))

    expect(screen.getByText('minjun@moastore.co.kr')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument()
  })
})
