import { useId, useState } from 'react'
import type { InsightRow } from '@/api/types'
import { formatCompact, formatMoney, formatMoneyCompact } from '@/lib/money'

type Props = { rows: InsightRow[]; currency: string; groupName: string }

const TICKS = 4
const COLUMNS = 'grid grid-cols-[1fr_auto] sm:grid-cols-[12rem_1fr_5.5rem]'

// Per group: a thin line from the lowest to the highest salary, a dot at the median.
// One currency per chart: salaries in different currencies can't share an axis.
// Plain HTML instead of a chart library: it's one series of positioned marks.
export function SalaryRangeChart({ rows, currency, groupName }: Props) {
  const [active, setActive] = useState<string | null>(null)
  const captionId = useId()
  const sorted = [...rows].sort((a, b) => Number(b.median) - Number(a.median))
  const scaleMax = niceMax(Math.max(...rows.map((row) => Number(row.max))))
  const position = (amount: string | number) => `${(Number(amount) / scaleMax) * 100}%`
  const ticks = Array.from({ length: TICKS + 1 }, (_, index) => (scaleMax / TICKS) * index)

  return (
    <figure aria-labelledby={captionId} className="grid gap-3">
      <figcaption id={captionId} className="text-sm font-medium">
        Median annual salary by {groupName}, {currency}
      </figcaption>
      <div className="flex gap-4 text-xs text-muted-foreground" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-chart-1" /> Median</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded-full bg-muted-foreground/50" /> Lowest to highest</span>
      </div>

      <ul className="grid">
        {sorted.map((row) => {
          const key = row.group.key
          const tooltipId = `${captionId}-${key}`
          return (
            <li key={key} tabIndex={0} aria-label={`${row.group.label}: median ${formatMoney(row.median, currency)}`}
                aria-describedby={active === key ? tooltipId : undefined}
                onMouseEnter={() => setActive(key)} onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(key)} onBlur={() => setActive(null)}
                className={`${COLUMNS} items-center gap-x-3 rounded-md px-1 py-1 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring sm:py-0`}>
              <span data-testid="chart-label" className="col-start-1 row-start-1 truncate text-sm" title={row.group.label}>{row.group.label}</span>
              {/* On a phone the label and value share a line and the plot gets the full width below. */}
              <div className="relative col-span-2 row-start-2 h-6 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:h-8">
                {ticks.map((tick) => (
                  <span key={tick} className="absolute inset-y-0 w-px bg-border" style={{ left: position(tick) }} />
                ))}
                <span className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-muted-foreground/50"
                      style={{ left: position(row.min), width: `calc(${position(row.max)} - ${position(row.min)})` }} />
                <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-1 ring-2 ring-card"
                      style={{ left: position(row.median) }} />
                {active === key && <Tooltip id={tooltipId} row={row} at={Number(row.median) / scaleMax} />}
              </div>
              <span className="col-start-2 row-start-1 text-right text-xs text-muted-foreground tabular-nums sm:col-start-3">{formatMoneyCompact(row.median, currency)}</span>
            </li>
          )
        })}
      </ul>

      <div className={`${COLUMNS} gap-x-3 px-1`} aria-hidden="true">
        <div className="relative col-span-2 h-4 sm:col-span-1 sm:col-start-2 text-xs text-muted-foreground tabular-nums">
          {ticks.map((tick, index) => (
            <span key={tick} className={`absolute ${index === TICKS ? '-translate-x-full' : index > 0 ? '-translate-x-1/2' : ''}`}
                  style={{ left: position(tick) }}>
              {formatCompact(tick)}
            </span>
          ))}
        </div>
      </div>
    </figure>
  )
}

// Opens above the row (the card would clip it below the last one), and anchors
// toward the middle of the plot near either edge so it never spills out sideways.
function Tooltip({ id, row, at }: { id: string; row: InsightRow; at: number }) {
  const money = (amount: string) => formatMoney(amount, row.currency)
  const anchor = at < 0.25 ? '' : at > 0.75 ? '-translate-x-full' : '-translate-x-1/2'
  return (
    <div id={id} role="tooltip" style={{ left: `${at * 100}%` }}
         className={`pointer-events-none absolute bottom-full z-10 mb-1 grid w-max ${anchor} gap-0.5 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md`}>
      <span className="font-medium">{row.group.label} · {row.headcount.toLocaleString('en-US')} employees</span>
      <span>Median {money(row.median)}</span>
      <span>Average {money(row.average)}</span>
      <span>Range {money(row.min)} – {money(row.max)}</span>
    </div>
  )
}

// Rounds the axis end up so each tick is a round number (1, 1.5, 2, 2.5, 3, 4, 5, 7.5 × a power
// of ten), finely enough that the plot doesn't waste half its width.
function niceMax(value: number): number {
  if (value <= 0) return 1
  const step = value / TICKS
  const magnitude = 10 ** Math.floor(Math.log10(step))
  const nice = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10].find((multiple) => multiple * magnitude >= step)!
  return nice * magnitude * TICKS
}
