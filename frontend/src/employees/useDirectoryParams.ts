import { useSearchParams } from 'react-router'

// The directory's state lives in the URL, so a filtered, sorted view can be
// bookmarked, shared, or restored with the back button.
export type DirectoryParams = {
  q?: string
  country?: string
  department?: string
  job_title?: string
  sort?: string
  page?: string
}

const KEYS = ['q', 'country', 'department', 'job_title', 'sort', 'page'] as const

export function useDirectoryParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const params: DirectoryParams = {}
  for (const key of KEYS) {
    const value = searchParams.get(key)
    if (value) params[key] = value
  }

  // Any change other than the page itself starts again from page 1.
  function update(changes: DirectoryParams, { replace = false } = {}) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (!('page' in changes)) next.delete('page')
    setSearchParams(next, { replace })
  }

  function clear() {
    setSearchParams(new URLSearchParams())
  }

  return { params, update, clear }
}
