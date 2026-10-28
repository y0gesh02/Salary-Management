import type { SalaryRecord } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney } from '@/lib/money'

const STATUS = {
  current: { label: 'Current', variant: 'default' },
  scheduled: { label: 'Scheduled', variant: 'secondary' },
  past: { label: 'Past', variant: 'outline' },
} as const

// Newest first, as the API returns it. Each record is shown in the period it was
// agreed in, with the annual figure alongside so raises are easy to compare.
export function SalaryHistory({ records }: { records: SalaryRecord[] }) {
  return (
    <Table aria-label="Salary history">
      <TableHeader>
        <TableRow>
          <TableHead>Effective date</TableHead>
          <TableHead>Pay</TableHead>
          <TableHead className="text-right">Annual</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => {
          const status = STATUS[record.status ?? 'past']
          return (
            <TableRow key={record.id} className={record.status === 'current' ? 'bg-muted/40' : undefined}>
              <TableCell className="tabular-nums">{record.effective_date}</TableCell>
              <TableCell className="tabular-nums">{formatMoney(record.amount, record.currency, record.period)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(record.annual_amount, record.currency)}</TableCell>
              <TableCell><Badge variant={status.variant} data-testid="status">{status.label}</Badge></TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
