import { useState } from 'react'
import type { GroupBy, InsightRow } from '@/api/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { useFilterOptions } from '@/employees/queries'
import { SalaryRangeChart } from './SalaryRangeChart'
import { StatisticsTable } from './StatisticsTable'
import { useSalaryInsights } from './queries'
import { useInsightParams } from './useInsightParams'

const GROUP_NAMES: Record<GroupBy, string> = { country: 'Country', department: 'Department', job_title: 'Job title' }

export function InsightsPage() {
  const { params, update } = useInsightParams()
  const insights = useSalaryInsights(params)
  const filters = useFilterOptions()
  const groupName = GROUP_NAMES[params.group_by]

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Salary insights</h1>
        <p className="text-sm text-muted-foreground">
          Current annual salaries{insights.data && <> as of {insights.data.as_of}</>}. Monthly pay is counted ×12.
          Salaries are shown in the currency they are paid in and never converted, so each currency gets its own row.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Select label="Group by" value={params.group_by} onChange={(group_by) => update({ group_by })}>
          {Object.entries(GROUP_NAMES).map(([value, label]) => <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}
        </Select>
        <Select label="Country" value={params.country ?? ''} onChange={(country) => update({ country })}>
          <NativeSelectOption value="">All countries</NativeSelectOption>
          {filters.data?.countries.map((country) => (
            <NativeSelectOption key={country.code} value={country.code}>{country.name}</NativeSelectOption>
          ))}
        </Select>
        <Select label="Department" value={params.department ?? ''} onChange={(department) => update({ department })}>
          <NativeSelectOption value="">All departments</NativeSelectOption>
          {filters.data?.departments.map((department) => (
            <NativeSelectOption key={department} value={department}>{department}</NativeSelectOption>
          ))}
        </Select>
      </div>

      {insights.isPending ? (
        <Skeleton className="h-64 w-full" aria-label="Loading insights" />
      ) : insights.isError ? (
        <Alert variant="destructive"><AlertDescription>{insights.error.message}</AlertDescription></Alert>
      ) : insights.data.data.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-muted-foreground">No current salaries match these filters.</CardContent></Card>
      ) : (
        <div className={`grid gap-4 ${insights.isPlaceholderData ? 'opacity-60 transition-opacity' : ''}`}>
          <ChartCard rows={insights.data.data} groupName={groupName.toLowerCase()} />
          <Card className="pb-0">
            <CardHeader><CardTitle>All figures</CardTitle></CardHeader>
            <CardContent className="px-0">
              <StatisticsTable rows={insights.data.data} groupLabel={groupName} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function ChartCard({ rows, groupName }: { rows: InsightRow[]; groupName: string }) {
  const currencies = currenciesByHeadcount(rows)
  const [chosen, setChosen] = useState<string | null>(null)
  // Default to the currency most employees in view are paid in; a choice that
  // is no longer in the data (after a filter change) falls back to it too.
  const currency = chosen && currencies.includes(chosen) ? chosen : currencies[0]
  const chartRows = rows.filter((row) => row.currency === currency)

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <CardTitle>Salary spread</CardTitle>
          <CardDescription>Hover or tab to a row for the full figures.</CardDescription>
        </div>
        {currencies.length > 1 && (
          <Select label="Chart currency" value={currency} onChange={setChosen}>
            {currencies.map((code) => <NativeSelectOption key={code} value={code}>{code}</NativeSelectOption>)}
          </Select>
        )}
      </CardHeader>
      <CardContent>
        {chartRows.length > 1 ? (
          <SalaryRangeChart rows={chartRows} currency={currency} groupName={groupName} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Only one group is paid in {currency}, so there is nothing to compare here. Its figures are in the table
            below; to compare within one currency, filter by a country and group by department or job title.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function currenciesByHeadcount(rows: InsightRow[]): string[] {
  const headcounts = new Map<string, number>()
  for (const row of rows) headcounts.set(row.currency, (headcounts.get(row.currency) ?? 0) + row.headcount)
  return [...headcounts.keys()].sort((a, b) => headcounts.get(b)! - headcounts.get(a)!)
}

type SelectProps<T extends string> = { label: string; value: T; onChange: (value: T) => void; children: React.ReactNode }

function Select<T extends string>({ label, value, onChange, children }: SelectProps<T>) {
  const id = `insights-${label.toLowerCase().replaceAll(' ', '-')}`
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <NativeSelect id={id} value={value} onChange={(event) => onChange(event.target.value as T)}>{children}</NativeSelect>
    </div>
  )
}
