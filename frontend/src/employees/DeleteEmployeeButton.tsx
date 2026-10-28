import { type MouseEvent, useState } from 'react'
import { useNavigate } from 'react-router'
import type { EmployeeDetail } from '@/api/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useDeleteEmployee } from './queries'

export function DeleteEmployeeButton({ employee }: { employee: EmployeeDetail }) {
  const [open, setOpen] = useState(false)
  const deleteEmployee = useDeleteEmployee(String(employee.id))
  const navigate = useNavigate()

  function handleDelete(event: MouseEvent) {
    // Keep the dialog open until the request finishes, so a failure is shown here.
    event.preventDefault()
    deleteEmployee.mutate(undefined, { onSuccess: () => navigate('/employees', { replace: true }) })
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => { setOpen(next); deleteEmployee.reset() }}>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Delete employee</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {employee.full_name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Their salary history will be deleted too. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteEmployee.error && (
          <Alert variant="destructive">
            <AlertDescription>{deleteEmployee.error.message}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={deleteEmployee.isPending} onClick={handleDelete}>
            {deleteEmployee.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
