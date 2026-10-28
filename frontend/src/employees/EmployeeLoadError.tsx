import { Alert, AlertDescription } from '@/components/ui/alert'
import { ApiError } from '@/lib/api'

export function EmployeeLoadError({ error }: { error: Error }) {
  const notFound = error instanceof ApiError && error.status === 404
  return (
    <Alert variant={notFound ? 'default' : 'destructive'}>
      <AlertDescription>{notFound ? 'Employee not found.' : error.message}</AlertDescription>
    </Alert>
  )
}
