import { useId } from 'react'
import type { InsightRow } from '@/api/types'

// How many people each group has. A count has no currency, so unlike salaries it can be
// compared across countries. Every value is printed, so there is no tooltip to hunt for.
export function HeadcountChart({ rows, groupName }: { rows: InsightRow[]; groupName: string }) {
  const captionId = useId()
  const groups = headcountByGroup(rows)
  const largest = Math.max(...groups.map((group) => group.headcount))

  return (
    <figure aria-labelledby={captionId} className="grid gap-3">
      <figcaption id={captionId} className="text-sm font-medium">Headcount by {groupName}</figcaption>
      <ul className="grid gap-0.5">
        {groups.map((group) => (
          <li key={group.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 px-1 py-1 sm:grid-cols-[12rem_1fr_5.5rem] sm:py-0">
            <span data-testid="chart-label" className="col-start-1 row-start-1 truncate text-sm" title={group.label}>{group.label}</span>
            <div className="col-span-2 row-start-2 flex h-6 items-center sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:h-8">
              <span className="h-3 rounded-r-[4px] bg-chart-1" style={{ width: `${(group.headcount / largest) * 100}%` }} />
            </div>
            <span className="col-start-2 row-start-1 text-right text-xs text-muted-foreground tabular-nums sm:col-start-3">
              {group.headcount.toLocaleString('en-US')}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

// A group paid in two currencies has two rows; its headcount is their sum.
function headcountByGroup(rows: InsightRow[]) {
  const groups = new Map<string, { key: string; label: string; headcount: number }>()
  for (const row of rows) {
    const group = groups.get(row.group.key) ?? { key: row.group.key, label: row.group.label, headcount: 0 }
    group.headcount += row.headcount
    groups.set(row.group.key, group)
  }
  return [...groups.values()].sort((a, b) => b.headcount - a.headcount)
}
