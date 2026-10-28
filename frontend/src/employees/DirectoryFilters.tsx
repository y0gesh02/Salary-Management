import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useFilterOptions } from './queries'
import type { DirectoryParams } from './useDirectoryParams'

const SEARCH_DELAY_MS = 300

type Props = {
  params: DirectoryParams
  onChange: (changes: DirectoryParams, options?: { replace?: boolean }) => void
}

export function DirectoryFilters({ params, onChange }: Props) {
  const options = useFilterOptions()
  const urlSearch = params.q ?? ''
  const [searchText, setSearchText] = useState(urlSearch)
  const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch)

  // Follow the URL when it changes from outside (back button, "Clear filters").
  // Compared trimmed, so a pause after "priya " doesn't eat the space being typed.
  if (urlSearch !== lastUrlSearch) {
    setLastUrlSearch(urlSearch)
    if (urlSearch !== searchText.trim()) setSearchText(urlSearch)
  }

  // Search once typing pauses, instead of on every keystroke. Replacing the
  // history entry keeps the back button from stepping through each letter.
  useEffect(() => {
    if (searchText.trim() === (params.q ?? '')) return
    const timer = setTimeout(() => onChange({ q: searchText.trim() }, { replace: true }), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [searchText, params.q, onChange])

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid min-w-56 flex-1 gap-1.5">
        <Label htmlFor="directory-search">Search</Label>
        <Input id="directory-search" type="search" aria-label="Search employees" placeholder="Name or email"
               value={searchText} onChange={(event) => setSearchText(event.target.value)} />
      </div>
      <FilterSelect id="filter-country" label="Country" value={params.country}
                    options={(options.data?.countries ?? []).map((country) => ({ value: country.code, label: country.name }))}
                    onChange={(country) => onChange({ country })} />
      <FilterSelect id="filter-department" label="Department" value={params.department}
                    options={(options.data?.departments ?? []).map((value) => ({ value, label: value }))}
                    onChange={(department) => onChange({ department })} />
      <FilterSelect id="filter-job-title" label="Job title" value={params.job_title}
                    options={(options.data?.job_titles ?? []).map((value) => ({ value, label: value }))}
                    onChange={(job_title) => onChange({ job_title })} />
    </div>
  )
}

type FilterSelectProps = {
  id: string
  label: string
  value?: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

function FilterSelect({ id, label, value, options, onChange }: FilterSelectProps) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} className="min-w-40" value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        <NativeSelectOption value="">All</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}
