import { type FormEvent, type ReactNode, useState } from 'react'
import type { EmployeeDetail, Period } from '@/api/types'
import { FormField } from '@/components/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ApiError } from '@/lib/api'
import { type NewEmployeeInput, type ProfileInput, useFilterOptions } from './queries'

type InitialSalary = NewEmployeeInput['initial_salary']

type Props = {
  // Given when editing; a new employee's form also asks for their starting salary.
  employee?: EmployeeDetail
  submitLabel: string
  pending: boolean
  error: Error | null
  onSubmit: (values: ProfileInput | NewEmployeeInput) => void
  cancel: ReactNode
}

const PERIOD_LABELS: Record<Period, string> = { annual: 'Annual', monthly: 'Monthly' }

export function EmployeeForm({ employee, submitLabel, pending, error, onSubmit, cancel }: Props) {
  const filters = useFilterOptions()
  const [profile, setProfile] = useState<ProfileInput>(() => initialProfile(employee))
  const [salary, setSalary] = useState<InitialSalary>({ amount: '', currency: '', period: 'annual' })
  // The currency follows the country until the HR manager picks one themselves
  // (someone working in Germany may be paid in USD).
  const [currencyChosen, setCurrencyChosen] = useState(false)

  const isNew = !employee
  const errors = error instanceof ApiError ? error.fieldErrors : {}
  const countries = filters.data?.countries ?? []

  function setField<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  function setSalaryField<K extends keyof InitialSalary>(key: K, value: InitialSalary[K]) {
    setSalary((current) => ({ ...current, [key]: value }))
  }

  function chooseCountry(code: string) {
    setField('country_code', code)
    const currency = countries.find((country) => country.code === code)?.currency
    if (currency && !currencyChosen) setSalaryField('currency', currency)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(isNew ? { ...profile, initial_salary: salary } : profile)
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="employee-full-name" label="Full name" errors={errors.full_name}>
            {(control) => <Input {...control} required autoComplete="off" value={profile.full_name}
                                 onChange={(event) => setField('full_name', event.target.value)} />}
          </FormField>
          <FormField id="employee-email" label="Email" errors={errors.email}>
            {(control) => <Input {...control} type="email" required autoComplete="off" value={profile.email}
                                 onChange={(event) => setField('email', event.target.value)} />}
          </FormField>
          <FormField id="employee-job-title" label="Job title" errors={errors.job_title}>
            {(control) => <Input {...control} required list="job-title-options" value={profile.job_title}
                                 onChange={(event) => setField('job_title', event.target.value)} />}
          </FormField>
          <FormField id="employee-department" label="Department" errors={errors.department}>
            {(control) => <Input {...control} required list="department-options" value={profile.department}
                                 onChange={(event) => setField('department', event.target.value)} />}
          </FormField>
          <FormField id="employee-country" label="Country" errors={errors.country_code}>
            {(control) => (
              <NativeSelect {...control} className="w-full" required value={profile.country_code}
                            onChange={(event) => chooseCountry(event.target.value)}>
                <NativeSelectOption value="" disabled>Select a country</NativeSelectOption>
                {countries.map((country) => (
                  <NativeSelectOption key={country.code} value={country.code}>{country.name}</NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField id="employee-hire-date" label="Hire date" errors={errors.hire_date}>
            {(control) => <Input {...control} type="date" required value={profile.hire_date}
                                 onChange={(event) => setField('hire_date', event.target.value)} />}
          </FormField>
          {/* Suggestions only: a new department or title can still be typed in. */}
          <datalist id="job-title-options">
            {filters.data?.job_titles.map((title) => <option key={title} value={title} />)}
          </datalist>
          <datalist id="department-options">
            {filters.data?.departments.map((department) => <option key={department} value={department} />)}
          </datalist>
        </CardContent>
      </Card>

      {isNew && (
        <Card>
          <CardHeader>
            <CardTitle>Starting salary</CardTitle>
            <CardDescription>Effective from the hire date. Later changes are recorded on the employee's page.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField id="salary-amount" label="Amount" errors={errors['initial_salary.amount']}>
              {(control) => <Input {...control} inputMode="decimal" required value={salary.amount}
                                   onChange={(event) => setSalaryField('amount', event.target.value)} />}
            </FormField>
            <FormField id="salary-currency" label="Currency" errors={errors['initial_salary.currency']}>
              {(control) => (
                <NativeSelect {...control} className="w-full" required value={salary.currency}
                              onChange={(event) => { setCurrencyChosen(true); setSalaryField('currency', event.target.value) }}>
                  <NativeSelectOption value="" disabled>Select</NativeSelectOption>
                  {filters.data?.currencies.map((currency) => (
                    <NativeSelectOption key={currency} value={currency}>{currency}</NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <FormField id="salary-period" label="Pay period" errors={errors['initial_salary.period']}>
              {(control) => (
                <NativeSelect {...control} className="w-full" value={salary.period}
                              onChange={(event) => setSalaryField('period', event.target.value as Period)}>
                  {(filters.data?.periods ?? ['annual', 'monthly']).map((period) => (
                    <NativeSelectOption key={period} value={period}>{PERIOD_LABELS[period]}</NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            </FormField>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : submitLabel}</Button>
        {cancel}
      </div>
    </form>
  )
}

function initialProfile(employee?: EmployeeDetail): ProfileInput {
  return {
    full_name: employee?.full_name ?? '',
    email: employee?.email ?? '',
    job_title: employee?.job_title ?? '',
    department: employee?.department ?? '',
    country_code: employee?.country.code ?? '',
    hire_date: employee?.hire_date ?? '',
  }
}
