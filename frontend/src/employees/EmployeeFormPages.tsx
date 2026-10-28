import { Link, useNavigate, useParams } from 'react-router'
import type { EmployeeDetail } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmployeeForm } from './EmployeeForm'
import { EmployeeLoadError } from './EmployeeLoadError'
import { type NewEmployeeInput, type ProfileInput, useCreateEmployee, useEmployee, useUpdateEmployee } from './queries'

export function NewEmployeePage() {
  const createEmployee = useCreateEmployee()
  const navigate = useNavigate()

  function handleSubmit(values: ProfileInput | NewEmployeeInput) {
    createEmployee.mutate(values as NewEmployeeInput, {
      onSuccess: (employee) => navigate(`/employees/${employee.id}`, { replace: true }),
    })
  }

  return (
    <div className="grid max-w-3xl gap-4">
      <h1 className="text-2xl font-semibold">Add employee</h1>
      <EmployeeForm submitLabel="Add employee" pending={createEmployee.isPending} error={createEmployee.error}
                    onSubmit={handleSubmit} cancel={<CancelLink to="/employees" />} />
    </div>
  )
}

export function EditEmployeePage() {
  const { id = '' } = useParams()
  const employee = useEmployee(id)

  return (
    <div className="grid max-w-3xl gap-4">
      <h1 className="text-2xl font-semibold">Edit employee</h1>
      {employee.isPending ? (
        <Skeleton className="h-64 w-full" aria-label="Loading employee" />
      ) : employee.isError ? (
        <EmployeeLoadError error={employee.error} />
      ) : (
        // The form copies the employee into its own state once; keyed so another employee starts fresh.
        <EditForm key={employee.data.id} employee={employee.data} />
      )}
    </div>
  )
}

function EditForm({ employee }: { employee: EmployeeDetail }) {
  const updateEmployee = useUpdateEmployee(String(employee.id))
  const navigate = useNavigate()
  const employeePath = `/employees/${employee.id}`

  return (
    <EmployeeForm employee={employee} submitLabel="Save changes" pending={updateEmployee.isPending}
                  error={updateEmployee.error} cancel={<CancelLink to={employeePath} />}
                  onSubmit={(values) => updateEmployee.mutate(values, { onSuccess: () => navigate(employeePath) })} />
  )
}

function CancelLink({ to }: { to: string }) {
  return (
    <Button variant="ghost" asChild>
      <Link to={to}>Cancel</Link>
    </Button>
  )
}
