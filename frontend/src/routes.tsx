import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './features/auth/LoginPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { RequestPage, RequestsPage } from './features/requests/RequestPages'
import { NotFoundPage } from './components/NotFoundPage'

export const router = createBrowserRouter([
  { path: '/login', Component: LoginPage },
  {
    Component: AppLayout,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', Component: DashboardPage },
      { path: '/requests', Component: RequestsPage },
      { path: '/requests/new', element: <RequestPage mode="new" /> },
      { path: '/requests/:id', element: <RequestPage mode="details" /> },
      { path: '/requests/:id/edit', element: <RequestPage mode="edit" /> },
      { path: '*', Component: NotFoundPage },
    ],
  },
])
