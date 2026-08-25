import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/features/auth'
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
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>,
  )
  return router
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HomePage', () => {
  it('uses the BATON brand name', () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, 401)))
    renderHome()

    expect(screen.getByText('BATON')).toBeInTheDocument()
    expect(screen.queryByText('BATON TOUCH')).not.toBeInTheDocument()
  })

  it.each([
    ['인수인계 하기', '/handovers/new/setup'],
    ['인수인계 받기', '/handovers/received'],
    ['인수인계 확인하기', '/reviews'],
  ])('navigates %s to its role start route', async (name, pathname) => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, 401)))
    const user = userEvent.setup()
    const router = renderHome()

    await user.click(screen.getByRole('button', { name: new RegExp(name) }))

    expect(router.state.location.pathname).toBe(pathname)
  })

  it('shows a preparation notice instead of the old mock signup form', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, 401)))
    renderHome()

    await user.click(await screen.findByRole('button', { name: '회원가입' }))

    expect(screen.getByRole('status')).toHaveTextContent('회원가입은 준비 중이에요.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows API profile metadata for a restored session', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      createdAt: '2026-08-25T12:00:00Z',
      email: 'haneul@moastore.co.kr',
      id: 'f22d04eb-e4f9-4899-953a-86ad86f00dd3',
      name: '정하늘',
      position: '매니저',
      team: '운영팀',
    })))
    renderHome()

    await user.click(await screen.findByRole('button', { name: /정하늘/ }))

    expect(screen.getByText('haneul@moastore.co.kr')).toBeInTheDocument()
    expect(screen.getByText('운영팀 · 매니저')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument()
  })
})
