import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Link } from 'react-router'
import type { EmployeeSummary } from '@/api/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney } from '@/lib/money'

// Sort keys understood by the API (EmployeeSearch::SORT_COLUMNS).
const COLUMNS = [
  { key: 'full_name', label: 'Name' },
  { key: 'job_title', label: 'Job title' },
  { key: 'department', label: 'Department' },
  { key: 'country', label: 'Country' },
  { key: 'hire_date', label: 'Hire date' },
  { key: 'annual_salary', label: 'Annual salary', align: 'right' },
] as const

type Props = {
  employees: EmployeeSummary[]
  sort: string
  onSort: (sort: string) => void
}

export function EmployeesTable({ employees, sort, onSort }: Props) {
  const sortKey = sort.replace(/^-/, '')
  const descending = sort.startsWith('-')

  // First click sorts ascending, the next one flips the direction.
  function toggle(key: string) {
    onSort(key === sortKey && !descending ? `-${key}` : key)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((column) => {
            const active = column.key === sortKey
            const Icon = !active ? ArrowUpDown : descending ? ArrowDown : ArrowUp
            return (
              <TableHead key={column.key} aria-sort={active ? (descending ? 'descending' : 'ascending') : undefined}
                         className={'align' in column ? 'text-right' : undefined}>
                <button type="button" onClick={() => toggle(column.key)}
                        aria-label={`Sort by ${column.label.toLowerCase()}`}
                        className="inline-flex items-center gap-1 hover:text-foreground">
                  {column.label}
                  <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                </button>
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <TableRow key={employee.id}>
            <TableCell>
              <Link to={`/employees/${employee.id}`} className="font-medium hover:underline">{employee.full_name}</Link>
              <div className="text-xs text-muted-foreground">{employee.email}</div>
            </TableCell>
            <TableCell>{employee.job_title}</TableCell>
            <TableCell>{employee.department}</TableCell>
            <TableCell>{employee.country.name}</TableCell>
            <TableCell className="tabular-nums">{employee.hire_date}</TableCell>
            <TableCell className="text-right tabular-nums"><SalaryCell employee={employee} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function SalaryCell({ employee }: { employee: EmployeeSummary }) {
  const salary = employee.current_salary
  if (!salary) return <span className="text-muted-foreground">No current salary</span>

  return (
    <>
      <div className="font-medium">{formatMoney(salary.annual_amount, salary.currency)}</div>
      {salary.period === 'monthly' && (
        <div className="text-xs text-muted-foreground">paid {formatMoney(salary.amount, salary.currency, 'monthly')}</div>
      )}
    </>
  )
}
