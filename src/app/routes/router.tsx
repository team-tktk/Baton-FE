import { createBrowserRouter } from 'react-router-dom'

import { DashboardPage } from '@/pages/dashboard'
import { NotFoundPage } from '@/pages/not-found'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
