import { createBrowserRouter } from 'react-router-dom'

import { HomePage } from '@/pages/home'
import { HandoverCreatePage } from '@/pages/handover-create'
import { HandoverArrivalPage, HandoverChatPage, HandoverOverviewPage, HandoverWorkspacePage } from '@/pages/handover-detail'
import { HandoverInboxPage } from '@/pages/handover-inbox'
import { NotFoundPage } from '@/pages/not-found'
import { RoutePlaceholder } from './RoutePlaceholder'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  { path: '/handovers/new/setup', element: <HandoverCreatePage step="setup" /> },
  { path: '/handovers/new/upload', element: <HandoverCreatePage step="upload" /> },
  { path: '/handovers/new/analyzing', element: <HandoverCreatePage step="analyzing" /> },
  { path: '/handovers/new/interview/:step', element: <HandoverCreatePage step="interview" /> },
  { path: '/handovers/new/document', element: <HandoverCreatePage step="document" /> },
  { path: '/handovers/new/complete', element: <HandoverCreatePage step="complete" /> },
  { path: '/handovers/received', element: <HandoverInboxPage /> },
  { path: '/handovers/:handoverId/arrival', element: <HandoverArrivalPage /> },
  { path: '/handovers/:handoverId/overview', element: <HandoverOverviewPage /> },
  { path: '/handovers/:handoverId/chat', element: <HandoverChatPage /> },
  { path: '/handovers/:handoverId', element: <HandoverWorkspacePage /> },
  { path: '/reviews', element: <RoutePlaceholder /> },
  { path: '/reviews/:handoverId', element: <RoutePlaceholder /> },
  { path: '/404', element: <NotFoundPage /> },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
