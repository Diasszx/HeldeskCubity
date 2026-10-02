import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './features/auth/LoginPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { RequestPage } from './features/requests/RequestPages'
import { RequestsPage } from './features/requests/RequestsPage'
import { RequestFormPage } from './features/requests/RequestFormPage'
import { NotFoundPage } from './components/NotFoundPage'

export const router = createBrowserRouter([
  { path: '/login', Component: LoginPage },
  {
    Component: AppLayout,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', Component: DashboardPage },
      { path: '/requests', Component: RequestsPage },
      { path: '/requests/new', element: <RequestFormPage mode="new" /> },
      { path: '/requests/:id', element: <RequestPage mode="details" /> },
      { path: '/requests/:id/edit', element: <RequestFormPage mode="edit" /> },
      { path: '*', Component: NotFoundPage },
    ],
  },
])
