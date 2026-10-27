import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { FullPageMessage } from '@/components/FullPageMessage'
import { useSession } from './session'

export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession()
  const location = useLocation()

  if (session.isPending) return <FullPageMessage>Loading…</FullPageMessage>
  if (session.isError) return <FullPageMessage>Can't reach the server. Please refresh the page.</FullPageMessage>
  if (!session.data.user) return <Navigate to="/login" replace state={{ from: location }} />

  return children
}
