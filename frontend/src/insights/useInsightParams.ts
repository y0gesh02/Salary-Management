import { useSearchParams } from 'react-router'
import type { GroupBy } from '@/api/types'

export type InsightParams = { group_by: GroupBy; country?: string; department?: string }

const GROUPINGS: GroupBy[] = ['country', 'department', 'job_title']

// Grouping and filters live in the URL, like the directory, so a view can be shared.
export function useInsightParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const groupBy = searchParams.get('group_by') as GroupBy | null

  const params: InsightParams = {
    group_by: groupBy && GROUPINGS.includes(groupBy) ? groupBy : 'country',
    country: searchParams.get('country') ?? undefined,
    department: searchParams.get('department') ?? undefined,
  }

  function update(changes: Partial<Record<keyof InsightParams, string>>) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    })
  }

  return { params, update }
}
