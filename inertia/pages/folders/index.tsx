import { Head, Link, router } from '@inertiajs/react'
import { ChevronLeft, ChevronRight, Download, FilterX, Plus, Search } from 'lucide-react'
import { useState } from 'react'

import { FolderList } from '~/components/folders/folder_list'
import { folderStatusLabel } from '~/components/folders/folder_status_badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { NativeSelect } from '~/components/ui/native-select'
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

function downloadFoldersCsv(folders: FolderItem[]) {
  const cell = (value: string | number | null | undefined) => {
    const text = String(value ?? '')
    const safeText = /^[=+@-]/.test(text) ? `'${text}` : text
    return `"${safeText.replaceAll('"', '""')}"`
  }
  const rows = [
    ['Pasta', 'Título', 'Cliente', 'Responsável', 'Área', 'Status', 'Criada em'],
    ...folders.map((folder) => [
      folder.code,
      folder.title,
      folder.client.name,
      folder.responsible_lawyer?.full_name ?? '',
      folder.area,
      folderStatusLabel(folder.status),
      folder.created_at,
    ]),
  ]
  const blob = new Blob([`\uFEFF${rows.map((row) => row.map(cell).join(';')).join('\n')}`], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'pastas.csv'
  anchor.click()
  URL.revokeObjectURL(url)
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
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto border-b border-gray-200 px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
            <div className="flex min-w-max gap-1">
              <button
                type="button"
                onClick={() => applyStatus('')}
                className={cn(
                  'border-b-2 px-3 pb-4 text-sm font-medium transition',
                  !localFilters.status
                    ? 'border-[#00b8d9] text-[#00b8d9]'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )}
              >
                Total
                <span className="ms-2 rounded-full bg-[#00b8d9] px-2.5 py-1 text-xs font-semibold text-white">
                  {totalCount.toString().padStart(2, '0')}
                </span>
              </button>
              {statusCounts.map((item) => (
                <button
                  key={item.status}
                  type="button"
                  onClick={() => applyStatus(item.status)}
                  className={cn(
                    'border-b-2 px-3 pb-4 text-sm font-medium transition',
                    localFilters.status === item.status
                      ? 'border-[#00b8d9] text-[#00b8d9]'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  )}
                >
                  {folderStatusLabel(item.status)}s{' '}
                  <span
                    className={cn(
                      'ms-2 rounded-full px-2.5 py-1 text-xs font-semibold',
                      localFilters.status === item.status
                        ? 'bg-[#00b8d9] text-white'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {item.count.toString().padStart(2, '0')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              visit({ page: 1 })
            }}
            className="grid gap-4 border-b border-gray-100 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(240px,1fr)_220px_auto_auto_auto] lg:gap-4"
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
                className="h-12 rounded-lg border-gray-300 ps-10 focus-visible:border-[#00b8d9] focus-visible:ring-[#00b8d9]/20"
              />
            </div>
            <NativeSelect
              name="area"
              value={localFilters.area}
              onChange={(event) => {
                const area = event.target.value
                setLocalFilters((current) => ({ ...current, area }))
                visit({ area, page: 1 })
              }}
              selectSize="lg"
            >
              <option value="">Todas as áreas</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </NativeSelect>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="outline"
                className="h-10 flex-1 rounded-full border-[#00b8d9]/50 font-bold text-[#00b8d9] hover:bg-[#00b8d9]/5 hover:text-[#00b8d9] sm:flex-none"
              >
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
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadFoldersCsv(folders.data)}
              disabled={folders.data.length === 0}
              className="h-10 rounded-full border-[#00b8d9]/50 font-bold text-[#00b8d9] hover:bg-[#00b8d9]/5 hover:text-[#00b8d9]"
            >
              <Download className="size-4" />
              Baixar
            </Button>
            <Button
              variant="outline"
              asChild
              className="h-10 rounded-full border-[#00b8d9]/50 font-bold text-[#00b8d9] hover:bg-[#00b8d9]/5 hover:text-[#00b8d9]"
            >
              <Link href="/folders/create">
                <Plus className="size-4" />
                Nova pasta
              </Link>
            </Button>
          </form>

          <FolderList
            folders={folders.data}
            sortBy={filters.sort_by}
            direction={filters.order}
            onSort={sort}
          />

          <footer className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>{folders.meta.total} resultado(s)</span>
              <span className="text-slate-300">·</span>
              <label htmlFor="folders-per-page" className="sr-only">
                Resultados por página
              </label>
              <NativeSelect
                id="folders-per-page"
                value={filters.per_page}
                onChange={(event) => visit({ per_page: Number(event.target.value), page: 1 })}
                selectSize="xs"
                containerClassName="w-36"
              >
                {[10, 20, 50].map((value) => (
                  <option key={value} value={value}>
                    {value} por página
                  </option>
                ))}
              </NativeSelect>
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
