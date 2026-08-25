import { createBrowserRouter } from 'react-router-dom'

import { HomePage } from '@/pages/home'
import { HandoverCreatePage } from '@/pages/handover-create'
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
  { path: '/handovers/received', element: <RoutePlaceholder /> },
  { path: '/handovers/:handoverId/arrival', element: <RoutePlaceholder /> },
  { path: '/handovers/:handoverId/overview', element: <RoutePlaceholder /> },
  { path: '/handovers/:handoverId/chat', element: <RoutePlaceholder /> },
  { path: '/handovers/:handoverId', element: <RoutePlaceholder /> },
  { path: '/reviews', element: <RoutePlaceholder /> },
  { path: '/reviews/:handoverId', element: <RoutePlaceholder /> },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
