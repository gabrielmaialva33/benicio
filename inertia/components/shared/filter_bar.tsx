import { router } from '@inertiajs/react'
import { FilterX, Search } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { NativeSelect } from '~/components/ui/native-select'

interface FilterOption {
  value: string
  label: string
}

interface FilterField {
  /** Query-string key, e.g. `person_type`. */
  key: string
  /** Placeholder shown as the "all" option, e.g. "Todos os tipos". */
  label: string
  options: FilterOption[]
}

interface FilterBarProps<TFilters extends object> {
  /** Path the filters navigate to, e.g. `/clients`. */
  baseUrl: string
  /**
   * Current values as the controller echoed them back. Generic because each
   * page owns its `*Filters` interface; only the keys declared in `fields`
   * (plus the search key) are read.
   */
  currentFilters: TFilters
  fields?: FilterField[]
  searchKey?: string
  searchPlaceholder?: string
  /** Params that must survive every navigation (per_page, sort_by, order). */
  preserveParams?: Record<string, string | number>
}

/**
 * List filtering over the query string: the server stays the source of truth
 * for the result set, and the URL stays shareable.
 *
 * Selects apply on change (a filter you picked should take effect) while free
 * text waits for submit (searching on every keystroke would fire a request per
 * letter).
 */
export function FilterBar<TFilters extends object>({
  baseUrl,
  currentFilters,
  fields = [],
  searchKey = 'search',
  searchPlaceholder = 'Buscar...',
  preserveParams = {},
}: FilterBarProps<TFilters>) {
  const current = currentFilters as Record<string, unknown>
  const [search, setSearch] = useState(String(current[searchKey] ?? ''))
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.key, String(current[field.key] ?? '')]))
  )

  const visit = (overrides: Record<string, string> = {}) => {
    const merged = { ...selected, ...overrides }
    const query: Record<string, string | number> = { ...preserveParams, page: 1 }

    for (const [key, value] of Object.entries(merged)) {
      if (value) query[key] = value
    }
    if (search.trim()) query[searchKey] = search.trim()

    router.get(baseUrl, query, { preserveState: true, preserveScroll: true, replace: true })
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    visit()
  }

  const clear = () => {
    setSearch('')
    setSelected(Object.fromEntries(fields.map((field) => [field.key, ''])))
    router.get(baseUrl, preserveParams, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    })
  }

  const hasActiveFilters = Boolean(search) || Object.values(selected).some(Boolean)

  return (
    <form
      onSubmit={submit}
      className="grid items-center gap-3 border-b border-gray-100 p-4 sm:grid-cols-[minmax(240px,1fr)_repeat(auto-fit,220px)_auto] sm:p-6"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          name={searchKey}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-12 ps-10"
        />
      </div>

      {fields.map((field) => (
        <NativeSelect
          key={field.key}
          name={field.key}
          aria-label={field.label}
          value={selected[field.key] ?? ''}
          onChange={(event) => {
            const value = event.target.value
            setSelected((current) => ({ ...current, [field.key]: value }))
            visit({ [field.key]: value })
          }}
          selectSize="lg"
        >
          <option value="">{field.label}</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      ))}

      <div className="flex gap-2">
        <Button type="submit" variant="outline" className="flex-1 sm:flex-none">
          Filtrar
        </Button>
        {hasActiveFilters && (
          <Button type="button" variant="ghost" onClick={clear} className="flex-1 sm:flex-none">
            <FilterX className="size-4" />
            Limpar
          </Button>
        )}
      </div>
    </form>
  )
}
