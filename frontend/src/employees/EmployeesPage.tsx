import { Link } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DirectoryFilters } from './DirectoryFilters'
import { EmployeesTable } from './EmployeesTable'
import { useEmployees } from './queries'
import { useDirectoryParams } from './useDirectoryParams'

const DEFAULT_SORT = 'full_name'

export function EmployeesPage() {
  const { params, update, clear } = useDirectoryParams()
  const employees = useEmployees(params)
  const hasFilters = Boolean(params.q || params.country || params.department || params.job_title)

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Employees</h1>
        <Button asChild>
          <Link to="/employees/new">Add employee</Link>
        </Button>
      </div>
      <DirectoryFilters params={params} onChange={update} />

      <Card className="py-0">
        <CardContent className="p-0">
          {employees.isPending ? (
            <LoadingRows />
          ) : employees.isError ? (
            <Alert variant="destructive" className="m-4 w-auto">
              <AlertDescription>{employees.error.message}</AlertDescription>
            </Alert>
          ) : employees.data.data.length === 0 ? (
            <div className="grid justify-items-center gap-3 p-10 text-center text-muted-foreground">
              <p>{hasFilters ? 'No employees match these filters.' : 'No employees yet.'}</p>
              {hasFilters && <Button variant="outline" onClick={clear}>Clear filters</Button>}
            </div>
          ) : (
            <div className={employees.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
              <EmployeesTable employees={employees.data.data} sort={params.sort ?? DEFAULT_SORT}
                              onSort={(sort) => update({ sort })} />
            </div>
          )}
        </CardContent>
      </Card>

      {employees.data && employees.data.meta.total > 0 && (
        <Pagination {...employees.data.meta} onPageChange={(page) => update({ page: String(page) })} />
      )}
    </div>
  )
}

type PaginationProps = { page: number; per_page: number; total: number; onPageChange: (page: number) => void }

function Pagination({ page, per_page, total, onPageChange }: PaginationProps) {
  const first = (page - 1) * per_page + 1
  const last = Math.min(page * per_page, total)
  const format = (value: number) => value.toLocaleString('en-US')

  return (
    <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <span>Showing {format(first)}–{format(last)} of {format(total)} employees</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" aria-label="Previous page" disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}>Previous</Button>
        <Button variant="outline" size="sm" aria-label="Next page" disabled={last >= total}
                onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </div>
  )
}

function LoadingRows() {
  return (
    <div className="grid gap-3 p-4" aria-label="Loading employees">
      {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-9 w-full" />)}
    </div>
  )
}
