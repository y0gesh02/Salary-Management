import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, setCsrfToken } from '@/lib/api'

export type Session = {
  user: { email: string } | null
  csrf_token: string
}

export type Credentials = { email: string; password: string }

export const sessionQueryKey = ['session'] as const

function remember(session: Session) {
  setCsrfToken(session.csrf_token)
  return session
}

export function useSession() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: async () => remember(await api.get<Session>('/session')),
    staleTime: Infinity,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (credentials: Credentials) => api.post<Session>('/session', credentials),
    onSuccess: (session) => queryClient.setQueryData(sessionQueryKey, remember(session)),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/session'),
    onSuccess: async () => {
      // Drop every cached salary figure, then fetch the new (logged-out) session and its fresh CSRF token.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== sessionQueryKey[0] })
      await queryClient.refetchQueries({ queryKey: sessionQueryKey })
    },
  })
}
