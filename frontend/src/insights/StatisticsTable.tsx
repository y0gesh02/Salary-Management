import type { InsightRow } from '@/api/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatAmount } from '@/lib/money'

const MONEY_COLUMNS = [
  { key: 'min', label: 'Min' },
  { key: 'median', label: 'Median' },
  { key: 'average', label: 'Average' },
  { key: 'max', label: 'Max' },
  { key: 'total', label: 'Total payroll' },
] as const

// Every figure, for every group and currency: the readable twin of the chart.
export function StatisticsTable({ rows, groupLabel }: { rows: InsightRow[]; groupLabel: string }) {
  return (
    <Table aria-label="Salary statistics">
      <TableHeader>
        <TableRow>
          <TableHead>{groupLabel}</TableHead>
          <TableHead>Currency</TableHead>
          <TableHead className="text-right">Headcount</TableHead>
          {MONEY_COLUMNS.map((column) => <TableHead key={column.key} className="text-right">{column.label}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.group.key}-${row.currency}`}>
            <TableCell className="font-medium">{row.group.label}</TableCell>
            <TableCell>{row.currency}</TableCell>
            <TableCell className="text-right tabular-nums">{row.headcount.toLocaleString('en-US')}</TableCell>
            {MONEY_COLUMNS.map((column) => (
              <TableCell key={column.key} className="text-right tabular-nums">{formatAmount(row[column.key])}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
