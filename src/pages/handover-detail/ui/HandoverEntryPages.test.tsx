import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { HandoverRepositoryProvider, MockHandoverRepository } from '@/entities/handover'

import { HandoverArrivalPage } from './HandoverArrivalPage'
import { HandoverOverviewPage } from './HandoverOverviewPage'

function renderRoutes(path: string) {
  const router = createMemoryRouter([
    { path: '/handovers/:handoverId/arrival', element: <HandoverArrivalPage /> },
    { path: '/handovers/:handoverId/overview', element: <HandoverOverviewPage /> },
    { path: '/handovers/:handoverId', element: <div>전체 인수인계 문서</div> },
    { path: '/404', element: <div>페이지를 찾을 수 없습니다.</div> },
  ], { initialEntries: [path] })
  render(<HandoverRepositoryProvider repository={new MockHandoverRepository()}><RouterProvider router={router} /></HandoverRepositoryProvider>)
  return router
}

describe('successor entry pages', () => {
  it('moves from the arrival schedule to the priority overview', async () => {
    const user = userEvent.setup()
    const router = renderRoutes('/handovers/handover-moastore-operations/arrival')
    expect(await screen.findByText('가을 할인전 내부 미팅')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /먼저 할 일 확인하기/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/handovers/handover-moastore-operations/overview'))
  })

  it('opens the full document from the overview', async () => {
    const user = userEvent.setup()
    const router = renderRoutes('/handovers/handover-moastore-operations/overview')
    await user.click(await screen.findByRole('button', { name: /전체 문서 보기/ }))
    expect(router.state.location.pathname).toBe('/handovers/handover-moastore-operations')
  })

  it('maps an unknown handover to the 404 route', async () => {
    const router = renderRoutes('/handovers/unknown/arrival')
    await waitFor(() => expect(router.state.location.pathname).toBe('/404'))
  })
})
