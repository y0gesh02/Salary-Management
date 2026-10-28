import { type FormEvent, useState } from 'react'
import type { EmployeeDetail, Period } from '@/api/types'
import { FormField } from '@/components/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ApiError } from '@/lib/api'
import { useFilterOptions, useRecordSalaryChange, type SalaryChange } from './queries'

const PERIOD_LABELS: Record<Period, string> = { annual: 'Annual', monthly: 'Monthly' }

export function RecordSalaryDialog({ employee }: { employee: EmployeeDetail }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Record salary change</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record salary change</DialogTitle>
          <DialogDescription>
            A raise, a correction or a future change. Earlier records are kept as history.
          </DialogDescription>
        </DialogHeader>
        {/* Rendered only while open, so the form starts fresh every time. */}
        <SalaryChangeForm employee={employee} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

function SalaryChangeForm({ employee, onSaved }: { employee: EmployeeDetail; onSaved: () => void }) {
  const filters = useFilterOptions()
  const recordChange = useRecordSalaryChange(String(employee.id))
  const [values, setValues] = useState<SalaryChange>(() => initialValues(employee))

  const errors = recordChange.error instanceof ApiError ? recordChange.error.fieldErrors : {}
  const currencies = filters.data?.currencies ?? [values.currency]
  const periods = filters.data?.periods ?? (['annual', 'monthly'] as Period[])

  function set<K extends keyof SalaryChange>(key: K, value: SalaryChange[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    recordChange.mutate(values, { onSuccess: onSaved })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {recordChange.error && (
        <Alert variant="destructive">
          <AlertDescription>{recordChange.error.message}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-4">
        <FormField id="salary-amount" label="Amount" errors={errors.amount}>
          {(control) => (
            <Input {...control} inputMode="decimal" required value={values.amount}
                   onChange={(event) => set('amount', event.target.value)} />
          )}
        </FormField>
        <FormField id="salary-currency" label="Currency" errors={errors.currency}>
          {(control) => (
            <NativeSelect {...control} className="w-full" value={values.currency}
                          onChange={(event) => set('currency', event.target.value)}>
              {currencies.map((currency) => <NativeSelectOption key={currency} value={currency}>{currency}</NativeSelectOption>)}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="salary-period" label="Pay period" errors={errors.period}>
          {(control) => (
            <NativeSelect {...control} className="w-full" value={values.period}
                          onChange={(event) => set('period', event.target.value as Period)}>
              {periods.map((period) => <NativeSelectOption key={period} value={period}>{PERIOD_LABELS[period]}</NativeSelectOption>)}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="salary-effective-date" label="Effective date" errors={errors.effective_date}>
          {(control) => (
            <Input {...control} type="date" required value={values.effective_date}
                   onChange={(event) => set('effective_date', event.target.value)} />
          )}
        </FormField>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={recordChange.isPending}>
          {recordChange.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Start from the pay in effect (or the latest record), so a raise only needs a new amount
// and date. The amount is left empty on purpose: copying the old figure invites saving it unchanged.
function initialValues(employee: EmployeeDetail): SalaryChange {
  const basis = employee.current_salary ?? employee.salary_history[0]
  return {
    amount: '',
    currency: basis?.currency ?? '',
    period: basis?.period ?? 'annual',
    effective_date: todayIso(),
  }
}

function todayIso() {
  const today = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
}
