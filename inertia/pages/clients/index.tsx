import { Head, Link, router } from '@inertiajs/react'
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  FolderOpen,
  Plus,
  UserRound,
  Users,
} from 'lucide-react'

import { ClientList, formatClientDocument } from '~/components/clients/client_list'
import { FilterBar } from '~/components/shared/filter_bar'
import { Button } from '~/components/ui/button'
import { NativeSelect } from '~/components/ui/native-select'
import { CLIENT_PERSON_TYPE_LABELS } from '~/lib/labels'
import { MainLayout } from '~/layouts'
import type {
  ClientFilters,
  ClientItem,
  ClientPaginationMeta,
  ClientSortField,
  ClientStats,
} from '~/types/client'

interface ClientsPageProps {
  clients: { data: ClientItem[]; meta: ClientPaginationMeta }
  filters: ClientFilters
  stats: ClientStats
}

function downloadClientsCsv(clients: ClientItem[]) {
  const cell = (value: string | number | null | undefined) => {
    const text = String(value ?? '')
    const safeText = /^[=+@-]/.test(text) ? `'${text}` : text
    return `"${safeText.replaceAll('"', '""')}"`
  }
  const rows = [
    ['Cliente', 'Documento', 'Tipo', 'E-mail', 'Telefone', 'Pastas', 'Cadastro'],
    ...clients.map((client) => [
      client.name,
      formatClientDocument(client.document, client.person_type),
      client.person_type === 'individual' ? 'Pessoa física' : 'Pessoa jurídica',
      client.email,
      client.phone,
      client.folders_total,
      client.created_at,
    ]),
  ]
  const blob = new Blob([`\uFEFF${rows.map((row) => row.map(cell).join(';')).join('\n')}`], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'clientes.csv'
  anchor.click()
  URL.revokeObjectURL(url)
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
  // #f7f8f9 sat a single step from the page background, so these read as empty
  // space. White plus the shell's shadow makes them read as cards.
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <span className={`flex size-10 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="size-5" />
      </span>
      <span>
        <strong className="block text-xl font-semibold text-yol-ink">{value}</strong>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </span>
    </div>
  )
}

export default function ClientsPage({ clients, filters, stats }: ClientsPageProps) {
  const visit = (
    overrides: {
      page?: number
      per_page?: number
      sort_by?: ClientSortField
      order?: 'asc' | 'desc'
    } = {}
  ) => {
    const query: Record<string, string | number> = {
      page: overrides.page ?? clients.meta.current_page,
      per_page: overrides.per_page ?? filters.per_page,
      sort_by: overrides.sort_by ?? filters.sort_by,
      order: overrides.order ?? filters.order,
    }
    if (filters.search.trim()) query.search = filters.search.trim()
    if (filters.person_type) query.person_type = filters.person_type

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

  return (
    <MainLayout>
      <Head title="Clientes" />
      <div className="space-y-6" data-testid="clients-index">
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadClientsCsv(clients.data)}
            disabled={clients.data.length === 0}
            className="rounded-full border-yol-cyan/50 text-yol-cyan hover:bg-cyan-50 hover:text-yol-cyan"
          >
            <Download className="size-4" />
            Baixar
          </Button>
          <Button asChild className="rounded-full">
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
          <FilterBar
            baseUrl="/clients"
            currentFilters={filters}
            searchPlaceholder="Nome, documento ou e-mail"
            preserveParams={{
              per_page: filters.per_page,
              sort_by: filters.sort_by,
              order: filters.order,
            }}
            fields={[
              {
                key: 'person_type',
                label: 'Todos os tipos',
                options: [
                  { value: 'individual', label: CLIENT_PERSON_TYPE_LABELS.individual },
                  { value: 'company', label: CLIENT_PERSON_TYPE_LABELS.company },
                ],
              },
            ]}
          />

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
              <NativeSelect
                aria-label="Resultados por página"
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
