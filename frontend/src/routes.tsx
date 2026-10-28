import { Navigate, type RouteObject } from 'react-router'
import { RequireAuth } from '@/auth/RequireAuth'
import { AppLayout } from '@/components/AppLayout'
import { EmployeePage } from '@/employees/EmployeePage'
import { EmployeesPage } from '@/employees/EmployeesPage'
import { InsightsPage } from '@/pages/InsightsPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/employees" replace /> },
      { path: 'employees', element: <EmployeesPage /> },
      { path: 'employees/:id', element: <EmployeePage /> },
      { path: 'insights', element: <InsightsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
