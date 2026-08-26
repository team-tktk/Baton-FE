import { createBrowserRouter } from 'react-router-dom'

import { RequireAuth } from '@/features/auth'
import { HomePage } from '@/pages/home'
import { HandoverCreatePage } from '@/pages/handover-create'
import { HandoverArrivalPage, HandoverChatPage, HandoverOverviewPage, HandoverWorkspacePage } from '@/pages/handover-detail'
import { HandoverInboxPage } from '@/pages/handover-inbox'
import { SentHandoverPage, SentHandoverDetailPage } from '@/pages/handover-sent'
import { NotFoundPage } from '@/pages/not-found'
import { ReviewDetailPage } from '@/pages/review-detail'
import { ReviewInboxPage } from '@/pages/review-inbox'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  { path: '/handovers/new/setup', element: <RequireAuth><HandoverCreatePage step="setup" /></RequireAuth> },
  { path: '/handovers/new/upload', element: <RequireAuth><HandoverCreatePage step="upload" /></RequireAuth> },
  { path: '/handovers/new/analyzing', element: <RequireAuth><HandoverCreatePage step="analyzing" /></RequireAuth> },
  { path: '/handovers/new/interview/:step', element: <RequireAuth><HandoverCreatePage step="interview" /></RequireAuth> },
  { path: '/handovers/new/document', element: <RequireAuth><HandoverCreatePage step="document" /></RequireAuth> },
  { path: '/handovers/new/complete', element: <RequireAuth><HandoverCreatePage step="complete" /></RequireAuth> },
  { path: '/handovers/received', element: <RequireAuth><HandoverInboxPage /></RequireAuth> },
  { path: '/handovers/sent', element: <RequireAuth><SentHandoverPage /></RequireAuth> },
  { path: '/handovers/sent/:handoverId', element: <RequireAuth><SentHandoverDetailPage /></RequireAuth> },
  { path: '/handovers/:handoverId/arrival', element: <RequireAuth><HandoverArrivalPage /></RequireAuth> },
  { path: '/handovers/:handoverId/overview', element: <RequireAuth><HandoverOverviewPage /></RequireAuth> },
  { path: '/handovers/:handoverId/chat', element: <RequireAuth><HandoverChatPage /></RequireAuth> },
  { path: '/handovers/:handoverId', element: <RequireAuth><HandoverWorkspacePage /></RequireAuth> },
  { path: '/reviews', element: <RequireAuth><ReviewInboxPage /></RequireAuth> },
  { path: '/reviews/:handoverId', element: <RequireAuth><ReviewDetailPage /></RequireAuth> },
  { path: '/404', element: <NotFoundPage /> },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
