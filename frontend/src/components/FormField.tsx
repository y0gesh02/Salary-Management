import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

type ControlProps = { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }

type Props = {
  id: string
  label: string
  errors?: string[]
  children: (control: ControlProps) => ReactNode
}

// A label, a control and the API's validation messages for it. The messages are
// linked with aria-describedby, so screen readers announce them with the field.
export function FormField({ id, label, errors = [], children }: Props) {
  const errorId = `${id}-error`
  const invalid = errors.length > 0

  return (
    // content-start: an error under a neighbouring field makes the row taller; keep this one top-aligned.
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children({ id, 'aria-invalid': invalid || undefined, 'aria-describedby': invalid ? errorId : undefined })}
      {invalid && <p id={errorId} className="text-sm text-destructive">{errors.join(', ')}</p>}
    </div>
  )
}
