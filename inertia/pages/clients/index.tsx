import { Head, Link, router, usePage } from '@inertiajs/react'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FilterX,
  FolderOpen,
  Plus,
  Search,
  UserRound,
  Users,
} from 'lucide-react'
import { useState } from 'react'

import { ClientList } from '~/components/clients/client_list'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { MainLayout } from '~/layouts'
import type {
  ClientFilters,
  ClientItem,
  ClientPaginationMeta,
  ClientPersonType,
  ClientSortField,
  ClientStats,
} from '~/types/client'

interface ClientsPageProps {
  clients: { data: ClientItem[]; meta: ClientPaginationMeta }
  filters: ClientFilters
  stats: ClientStats
}

interface SharedFlashProps {
  flash?: { success?: string | null; error?: string | null }
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users
  label: string
  value: number
  tone: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-[#f7f8f9] p-4">
      <span className={`flex size-10 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="size-5" />
      </span>
      <span>
        <strong className="block text-xl font-semibold text-[#1f2a37]">{value}</strong>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </span>
    </div>
  )
}

export default function ClientsPage({ clients, filters, stats }: ClientsPageProps) {
  const { flash } = usePage().props as SharedFlashProps
  const [search, setSearch] = useState(filters.search)
  const [personType, setPersonType] = useState<ClientPersonType | ''>(filters.person_type ?? '')

  const visit = (
    overrides: {
      page?: number
      per_page?: number
      sort_by?: ClientSortField
      order?: 'asc' | 'desc'
      search?: string
      person_type?: ClientPersonType | ''
    } = {}
  ) => {
    const nextSearch = overrides.search ?? search
    const nextType = overrides.person_type ?? personType
    const query: Record<string, string | number> = {
      page: overrides.page ?? clients.meta.current_page,
      per_page: overrides.per_page ?? filters.per_page,
      sort_by: overrides.sort_by ?? filters.sort_by,
      order: overrides.order ?? filters.order,
    }
    if (nextSearch.trim()) query.search = nextSearch.trim()
    if (nextType) query.person_type = nextType

    router.get('/clients', query, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    })
  }

  const sort = (field: ClientSortField) => {
    visit({
      sort_by: field,
      order: filters.sort_by === field && filters.order === 'asc' ? 'desc' : 'asc',
      page: 1,
    })
  }

  const clearFilters = () => {
    setSearch('')
    setPersonType('')
    router.get(
      '/clients',
      { per_page: filters.per_page, sort_by: filters.sort_by, order: filters.order },
      { preserveState: true, preserveScroll: true, replace: true }
    )
  }

  return (
    <MainLayout>
      <Head title="Clientes" />
      <div className="space-y-6" data-testid="clients-index">
        {flash?.success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="size-4" />
            {flash.success}
          </div>
        )}
        {flash?.error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertTriangle className="size-4" />
            {flash.error}
          </div>
        )}
        <div className="flex justify-end">
          <Button asChild className="bg-[#00b8d9] text-white shadow-none hover:bg-[#00a7c6]">
            <Link href="/clients/create">
              <Plus className="size-4" />
              Novo cliente
            </Link>
          </Button>
        </div>

        <section
          aria-label="Totais do escritório"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <StatCard
            icon={Users}
            label="Clientes cadastrados"
            value={stats.total}
            tone="bg-slate-100 text-slate-600"
          />
          <StatCard
            icon={UserRound}
            label="Pessoas físicas"
            value={stats.individuals}
            tone="bg-violet-50 text-violet-600"
          />
          <StatCard
            icon={Building2}
            label="Pessoas jurídicas"
            value={stats.companies}
            tone="bg-cyan-50 text-cyan-600"
          />
          <StatCard
            icon={FolderOpen}
            label="Com pasta ativa"
            value={stats.with_active_folders}
            tone="bg-emerald-50 text-emerald-600"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_4px_4px_rgba(0,0,0,0.03)]">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              visit({ page: 1 })
            }}
            className="grid gap-3 border-b border-gray-100 p-4 sm:grid-cols-[minmax(240px,1fr)_220px_auto] sm:p-6"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                name="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome, documento ou e-mail"
                className="h-12 ps-10"
              />
            </div>
            <select
              name="person_type"
              value={personType}
              onChange={(event) => {
                const value = event.target.value as ClientPersonType | ''
                setPersonType(value)
                visit({ person_type: value, page: 1 })
              }}
              className="h-12 rounded-lg border border-gray-300 bg-white px-4 text-sm text-[#1f2a37] outline-none transition focus:border-[#1cd6f4] focus:ring-2 focus:ring-cyan-100"
            >
              <option value="">Todos os tipos</option>
              <option value="individual">Pessoa física</option>
              <option value="company">Pessoa jurídica</option>
            </select>
            <div className="flex gap-2">
              <Button type="submit" variant="outline" className="flex-1 sm:flex-none">
                <Search className="size-4" />
                Buscar
              </Button>
              {(search || personType) && (
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

          <ClientList
            clients={clients.data}
            sortBy={filters.sort_by}
            direction={filters.order}
            onSort={sort}
          />

          <footer className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>{clients.meta.total} resultado(s)</span>
              <span className="text-slate-300">·</span>
              <select
                aria-label="Resultados por página"
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
                variant="outline"
                size="sm"
                disabled={clients.meta.current_page <= 1}
                onClick={() => visit({ page: clients.meta.current_page - 1 })}
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
              <span className="whitespace-nowrap text-xs font-semibold text-slate-500">
                Página {clients.meta.current_page} de {clients.meta.last_page}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={clients.meta.current_page >= clients.meta.last_page}
                onClick={() => visit({ page: clients.meta.current_page + 1 })}
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
