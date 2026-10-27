import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'
import { sessionQueryKey } from '@/auth/session'

// A 4xx won't fix itself on retry, so only network and server errors are retried.
function shouldRetry(failureCount: number, error: Error) {
  if (error instanceof ApiError && error.status < 500) return false
  return failureCount < 2
}

export function createQueryClient() {
  const queryClient: QueryClient = new QueryClient({
    // If the session expires mid-use, any 401 re-checks the session, and the
    // route guard then sends the HR manager back to the login page.
    queryCache: new QueryCache({ onError: (error) => handleUnauthorized(error) }),
    mutationCache: new MutationCache({ onError: (error) => handleUnauthorized(error) }),
    defaultOptions: { queries: { retry: shouldRetry, refetchOnWindowFocus: false } },
  })

  function handleUnauthorized(error: Error) {
    if (error instanceof ApiError && error.status === 401) {
      void queryClient.invalidateQueries({ queryKey: sessionQueryKey })
    }
  }

  return queryClient
}
