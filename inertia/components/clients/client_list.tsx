import { Link } from '@inertiajs/react'
import { ArrowRight, ArrowUpDown, BriefcaseBusiness, Mail, Phone, Users } from 'lucide-react'

import { ClientPersonBadge } from './client_person_badge'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import type { ClientItem, ClientSortField } from '~/types/client'

interface ClientListProps {
  clients: ClientItem[]
  sortBy: ClientSortField
  direction: 'asc' | 'desc'
  onSort: (field: ClientSortField) => void
}

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function formatClientDocument(document: string, personType: ClientItem['person_type']) {
  if (!/^\d+$/.test(document)) return document
  if (personType === 'individual' && document.length === 11) {
    return document.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  }
  if (personType === 'company' && document.length === 14) {
    return document.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }
  return document
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(value))
    .replace('.', '')
}

function SortButton({
  field,
  label,
  sortBy,
  direction,
  onSort,
}: {
  field: ClientSortField
  label: string
  sortBy: ClientSortField
  direction: 'asc' | 'desc'
  onSort: (field: ClientSortField) => void
}) {
  const active = sortBy === field
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold transition hover:text-slate-900 dark:hover:text-white',
        active && 'text-slate-900 dark:text-white'
      )}
      aria-label={`Ordenar por ${label}${active ? `, ordem ${direction === 'asc' ? 'crescente' : 'decrescente'}` : ''}`}
    >
      {label}
      <ArrowUpDown className={cn('size-3.5', active ? 'text-[#f97316]' : 'text-slate-300')} />
    </button>
  )
}

function ClientMobileCard({ client }: { client: ClientItem }) {
  return (
    <Link
      href={`/clients/${client.id}`}
      className="block min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md dark:border-white/10 dark:bg-card"
    >
      <div className="flex min-w-0 items-start gap-3">
        <Avatar className="size-11 shrink-0 rounded-xl">
          <AvatarFallback className="rounded-xl bg-emerald-50 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            {initialsOf(client.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold text-slate-900 dark:text-white">{client.name}</h3>
          <p className="mt-1 font-mono text-xs text-slate-500">
            {formatClientDocument(client.document, client.person_type)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <ClientPersonBadge personType={client.person_type} />
        <span className="text-xs font-semibold text-slate-500">
          {client.folders_total} pasta(s)
        </span>
      </div>
      {(client.email || client.phone) && (
        <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-white/10">
          {client.email && (
            <span className="flex min-w-0 items-center gap-2">
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{client.email}</span>
            </span>
          )}
          {client.phone && (
            <span className="flex items-center gap-2">
              <Phone className="size-3.5 shrink-0" />
              {client.phone}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}

export function ClientList({ clients, sortBy, direction, onSort }: ClientListProps) {
  if (clients.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
          <Users className="size-7" />
        </span>
        <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
          Nenhum cliente encontrado
        </h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Ajuste os filtros ou cadastre o primeiro cliente deste escritório.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid min-w-0 gap-3 p-4 md:hidden">
        {clients.map((client) => (
          <ClientMobileCard key={client.id} client={client} />
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[920px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[31%]" />
            <col className="w-[18%]" />
            <col className="w-[22%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-14" />
          </colgroup>
          <thead className="border-y border-slate-200/80 bg-slate-50/80 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.03]">
            <tr>
              <th className="px-5 py-3.5">
                <SortButton field="name" label="Cliente" {...{ sortBy, direction, onSort }} />
              </th>
              <th className="px-5 py-3.5">Tipo</th>
              <th className="px-5 py-3.5">Contato</th>
              <th className="px-5 py-3.5">Pastas</th>
              <th className="px-5 py-3.5">
                <SortButton
                  field="created_at"
                  label="Cadastro"
                  {...{ sortBy, direction, onSort }}
                />
              </th>
              <th className="px-5 py-3.5"><span className="sr-only">Abrir</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {clients.map((client) => (
              <tr key={client.id} className="group transition hover:bg-orange-50/30 dark:hover:bg-white/[0.025]">
                <td className="px-5 py-4">
                  <Link href={`/clients/${client.id}`} className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-10 shrink-0 rounded-xl">
                      <AvatarFallback className="rounded-xl bg-emerald-50 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        {initialsOf(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900 dark:text-white">
                        {client.name}
                      </span>
                      <span className="mt-0.5 block font-mono text-xs text-slate-500">
                        {formatClientDocument(client.document, client.person_type)}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-4"><ClientPersonBadge personType={client.person_type} /></td>
                <td className="px-5 py-4">
                  <div className="min-w-0 space-y-1 text-xs text-slate-500">
                    <span className="block max-w-56 truncate font-medium text-slate-700 dark:text-slate-200">
                      {client.email ?? 'Sem e-mail'}
                    </span>
                    <span>{client.phone ?? 'Sem telefone'}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                    <BriefcaseBusiness className="size-4 text-slate-400" />
                    {client.folders_total}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {client.active_folders} ativa(s)
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                  {formatDate(client.created_at)}
                </td>
                <td className="px-5 py-4 text-right">
                  <Button variant="ghost" mode="icon" asChild aria-label={`Abrir cliente ${client.name}`}>
                    <Link href={`/clients/${client.id}`}>
                      <ArrowRight className="size-4 transition group-hover:translate-x-0.5 group-hover:text-[#f97316]" />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
