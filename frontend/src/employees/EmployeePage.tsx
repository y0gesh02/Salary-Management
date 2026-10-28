import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import type { EmployeeDetail } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '@/lib/money'
import { DeleteEmployeeButton } from './DeleteEmployeeButton'
import { EmployeeLoadError } from './EmployeeLoadError'
import { RecordSalaryDialog } from './RecordSalaryDialog'
import { SalaryHistory } from './SalaryHistory'
import { useEmployee } from './queries'

export function EmployeePage() {
  const { id = '' } = useParams()
  const employee = useEmployee(id)

  return (
    <div className="grid gap-4">
      <Link to="/employees" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to employees
      </Link>

      {employee.isPending ? (
        <div className="grid gap-3" aria-label="Loading employee">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : employee.isError ? (
        <EmployeeLoadError error={employee.error} />
      ) : (
        <EmployeeDetails employee={employee.data} />
      )}
    </div>
  )
}

function EmployeeDetails({ employee }: { employee: EmployeeDetail }) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">{employee.full_name}</h1>
          <p className="text-muted-foreground">
            {employee.job_title} · {employee.department} · {employee.country.name}
          </p>
          <p className="text-sm text-muted-foreground">
            <span>{employee.email}</span> · <span className="tabular-nums">Hired {employee.hire_date}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <RecordSalaryDialog employee={employee} />
          <Button variant="outline" asChild>
            <Link to={`/employees/${employee.id}/edit`}>Edit</Link>
          </Button>
          <DeleteEmployeeButton employee={employee} />
        </div>
      </div>

      <CurrentSalary employee={employee} />

      <Card className="pb-0">
        <CardHeader>
          <CardTitle>Salary history</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <SalaryHistory records={employee.salary_history} />
        </CardContent>
      </Card>
    </>
  )
}

// "Current" is the record with the latest effective date on or before today (decided by
// the API, see SalaryRecord.current_as_of). A scheduled raise is shown as upcoming.
function CurrentSalary({ employee }: { employee: EmployeeDetail }) {
  const salary = employee.current_salary
  const next = employee.salary_history.findLast((record) => record.status === 'scheduled')

  return (
    <Card role="region" aria-labelledby="current-salary-title">
      <CardHeader>
        <CardTitle id="current-salary-title">Current salary</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-1">
        {salary ? (
          <>
            <p className="text-2xl font-semibold tabular-nums">{formatMoney(salary.annual_amount, salary.currency, 'annual')}</p>
            {salary.period === 'monthly' && (
              <p className="text-sm text-muted-foreground">paid {formatMoney(salary.amount, salary.currency, 'monthly')}</p>
            )}
            <p className="text-sm text-muted-foreground tabular-nums">Since {salary.effective_date}</p>
          </>
        ) : (
          <p className="text-muted-foreground">No salary in effect yet.</p>
        )}
        {next && (
          <p className="text-sm tabular-nums">
            {formatMoney(next.annual_amount, next.currency, 'annual')} starts on {next.effective_date}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
