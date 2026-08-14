import { Head, Link, router } from '@inertiajs/react'
import { ChevronLeft, ChevronRight, FilterX, Plus, Search } from 'lucide-react'
import { useState } from 'react'

import { FolderList } from '~/components/folders/folder_list'
import { folderStatusLabel } from '~/components/folders/folder_status_badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { MainLayout } from '~/layouts'
import { cn } from '~/lib/utils'
import type {
  FolderFilters,
  FolderItem,
  FolderPaginationMeta,
  FolderSortField,
  FolderStatus,
  FolderStatusCount,
} from '~/types/folder'

interface FoldersPageProps {
  folders: { data: FolderItem[]; meta: FolderPaginationMeta }
  filters: FolderFilters
  areas: string[]
  status_counts: FolderStatusCount[]
  total_count: number
}

interface LocalFilters {
  search: string
  status: FolderStatus | ''
  area: string
}

export default function FoldersPage({
  folders,
  filters,
  areas,
  status_counts: statusCounts,
  total_count: totalCount,
}: FoldersPageProps) {
  const [localFilters, setLocalFilters] = useState<LocalFilters>({
    search: filters.search,
    status: filters.status ?? '',
    area: filters.area,
  })

  const visit = (
    overrides: Partial<LocalFilters> & {
      page?: number
      per_page?: number
      sort_by?: FolderSortField
      order?: 'asc' | 'desc'
    } = {}
  ) => {
    const next = { ...localFilters, ...overrides }
    const query: Record<string, string | number> = {
      page: overrides.page ?? folders.meta.current_page,
      per_page: overrides.per_page ?? filters.per_page,
      sort_by: overrides.sort_by ?? filters.sort_by,
      order: overrides.order ?? filters.order,
    }

    if (next.search.trim()) query.search = next.search.trim()
    if (next.status) query.status = next.status
    if (next.area) query.area = next.area

    router.get('/folders', query, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    })
  }

  const applyStatus = (status: FolderStatus | '') => {
    setLocalFilters((current) => ({ ...current, status }))
    visit({ status, page: 1 })
  }

  const clearFilters = () => {
    const empty: LocalFilters = { search: '', status: '', area: '' }
    setLocalFilters(empty)
    router.get(
      '/folders',
      { per_page: filters.per_page, sort_by: filters.sort_by, order: filters.order },
      { preserveState: true, preserveScroll: true, replace: true }
    )
  }

  const sort = (field: FolderSortField) => {
    visit({
      sort_by: field,
      order: filters.sort_by === field && filters.order === 'asc' ? 'desc' : 'asc',
      page: 1,
    })
  }

  const hasFilters = Boolean(localFilters.search || localFilters.status || localFilters.area)

  return (
    <MainLayout>
      <Head title="Pastas" />

      <div className="space-y-6" data-testid="folders-index">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.035em] text-slate-900 dark:text-white">
              Pastas do escritório
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Consulte casos, responsáveis e situação operacional em um só lugar.
            </p>
          </div>
          <Button variant="primary" asChild className="bg-[#f97316] text-white hover:bg-[#ea680c]">
            <Link href="/folders/create">
              <Plus className="size-4" />
              Nova pasta
            </Link>
          </Button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-card">
          <div className="overflow-x-auto border-b border-slate-100 px-4 pt-4 dark:border-white/10 sm:px-6">
            <div className="flex min-w-max gap-1">
              <button
                type="button"
                onClick={() => applyStatus('')}
                className={cn(
                  'border-b-2 px-3 py-3 text-sm font-bold transition',
                  !localFilters.status
                    ? 'border-[#f97316] text-[#f97316]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                )}
              >
                Todas <span className="ms-1 text-xs opacity-60">{totalCount}</span>
              </button>
              {statusCounts.map((item) => (
                <button
                  key={item.status}
                  type="button"
                  onClick={() => applyStatus(item.status)}
                  className={cn(
                    'border-b-2 px-3 py-3 text-sm font-bold transition',
                    localFilters.status === item.status
                      ? 'border-[#f97316] text-[#f97316]'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  )}
                >
                  {folderStatusLabel(item.status)}s{' '}
                  <span className="ms-1 text-xs opacity-60">{item.count}</span>
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              visit({ page: 1 })
            }}
            className="grid gap-3 border-b border-slate-100 p-4 dark:border-white/10 sm:grid-cols-[minmax(240px,1fr)_220px_auto] sm:p-6"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                name="search"
                value={localFilters.search}
                onChange={(event) =>
                  setLocalFilters((current) => ({ ...current, search: event.target.value }))
                }
                placeholder="Código, título, descrição ou cliente"
                className="h-10 ps-10"
              />
            </div>
            <select
              name="area"
              value={localFilters.area}
              onChange={(event) => {
                const area = event.target.value
                setLocalFilters((current) => ({ ...current, area }))
                visit({ area, page: 1 })
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <option value="">Todas as áreas</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button type="submit" variant="outline" className="flex-1 sm:flex-none">
                <Search className="size-4" />
                Buscar
              </Button>
              {hasFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  onClick={clearFilters}
                  aria-label="Limpar filtros"
                >
                  <FilterX className="size-4" />
                </Button>
              )}
            </div>
          </form>

          <FolderList
            folders={folders.data}
            sortBy={filters.sort_by}
            direction={filters.order}
            onSort={sort}
          />

          <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>{folders.meta.total} resultado(s)</span>
              <span className="text-slate-300">·</span>
              <label htmlFor="folders-per-page" className="sr-only">
                Resultados por página
              </label>
              <select
                id="folders-per-page"
                value={filters.per_page}
                onChange={(event) => visit({ per_page: Number(event.target.value), page: 1 })}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              >
                {[10, 20, 50].map((value) => (
                  <option key={value} value={value}>
                    {value} por página
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={folders.meta.current_page <= 1}
                onClick={() => visit({ page: folders.meta.current_page - 1 })}
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
              <span className="whitespace-nowrap text-xs font-semibold text-slate-500">
                Página {folders.meta.current_page} de {folders.meta.last_page}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={folders.meta.current_page >= folders.meta.last_page}
                onClick={() => visit({ page: folders.meta.current_page + 1 })}
              >
                Próxima
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </footer>
        </section>
      </div>
    </MainLayout>
  )
}
