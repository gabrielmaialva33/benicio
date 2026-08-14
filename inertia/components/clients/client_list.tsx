import { Link } from '@inertiajs/react'
import { ArrowRight, ArrowUpDown, BriefcaseBusiness, Mail, Phone, Users } from 'lucide-react'
import { useState } from 'react'

import { ClientPersonBadge } from './client_person_badge'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { APP_TIME_ZONE } from '~/lib/date'
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
    timeZone: APP_TIME_ZONE,
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
        'inline-flex items-center gap-1.5 font-semibold transition hover:text-[#1f2a37]',
        active && 'text-[#1f2a37]'
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
      className="block min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_4px_rgba(0,0,0,0.03)] transition hover:border-cyan-200"
    >
      <div className="flex min-w-0 items-start gap-3">
        <Avatar className="size-11 shrink-0 rounded-xl">
          <AvatarFallback className="rounded-xl bg-cyan-50 text-xs font-bold text-cyan-700">
            {initialsOf(client.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-[#1f2a37]">{client.name}</h3>
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
        <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3 text-xs text-slate-500">
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const allSelected = clients.length > 0 && clients.every((client) => selectedIds.has(client.id))

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(clients.map((client) => client.id)))
  }

  const toggleOne = (clientId: number) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(clientId)) next.delete(clientId)
      else next.add(clientId)
      return next
    })
  }

  if (clients.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-cyan-50 text-yol-cyan">
          <Users className="size-7" />
        </span>
        <h3 className="mt-4 text-base font-semibold text-[#1f2a37]">Nenhum cliente encontrado</h3>
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
        <table className="w-full min-w-[980px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-12" />
            <col className="w-[29%]" />
            <col className="w-[18%]" />
            <col className="w-[22%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-14" />
          </colgroup>
          <thead className="border-y border-gray-200 bg-[#f7f8f9] text-xs font-semibold text-gray-500">
            <tr>
              <th className="py-3.5 pl-4">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Selecionar todos os clientes desta página"
                  className="size-4 rounded border-gray-300 accent-cyan-500"
                />
              </th>
              <th className="px-4 py-3.5">
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
              <th className="px-5 py-3.5">
                <span className="sr-only">Abrir</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.map((client) => (
              <tr
                key={client.id}
                className={cn(
                  'group transition hover:bg-cyan-50/30',
                  selectedIds.has(client.id) && 'bg-cyan-50/40'
                )}
              >
                <td className="py-4 pl-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(client.id)}
                    onChange={() => toggleOne(client.id)}
                    aria-label={`Selecionar cliente ${client.name}`}
                    className="size-4 rounded border-gray-300 accent-cyan-500"
                  />
                </td>
                <td className="px-4 py-4">
                  <Link href={`/clients/${client.id}`} className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-10 shrink-0 rounded-xl">
                      <AvatarFallback className="rounded-xl bg-cyan-50 text-xs font-bold text-cyan-700">
                        {initialsOf(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[#1f2a37]">
                        {client.name}
                      </span>
                      <span className="mt-0.5 block font-mono text-xs text-slate-500">
                        {formatClientDocument(client.document, client.person_type)}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <ClientPersonBadge personType={client.person_type} />
                </td>
                <td className="px-5 py-4">
                  <div className="min-w-0 space-y-1 text-xs text-slate-500">
                    <span className="block max-w-56 truncate font-medium text-slate-700">
                      {client.email ?? 'Sem e-mail'}
                    </span>
                    <span>{client.phone ?? 'Sem telefone'}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="flex items-center gap-2 font-semibold text-slate-700">
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
                <td className="py-4 pl-3 pr-6 text-right">
                  <Button
                    variant="ghost"
                    mode="icon"
                    asChild
                    aria-label={`Abrir cliente ${client.name}`}
                  >
                    <Link href={`/clients/${client.id}`}>
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-yol-cyan"
                      />
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
