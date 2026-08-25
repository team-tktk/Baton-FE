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
  { path: '/handovers/new/analyzing', element: <RoutePlaceholder /> },
  { path: '/handovers/new/interview/:step', element: <RoutePlaceholder /> },
  { path: '/handovers/new/document', element: <RoutePlaceholder /> },
  { path: '/handovers/new/complete', element: <RoutePlaceholder /> },
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
