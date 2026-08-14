import { Link } from '@inertiajs/react'
import { ArrowRight, ArrowUpDown, BriefcaseBusiness, UserRound } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { cn } from '~/lib/utils'
import type { FolderItem, FolderSortField } from '~/types/folder'
import { FolderStatusBadge } from './folder_status_badge'

interface FolderListProps {
  folders: FolderItem[]
  sortBy: FolderSortField
  direction: 'asc' | 'desc'
  onSort: (field: FolderSortField) => void
}

function initialsOf(value: string) {
  return value
    .split(' ')
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data inválida'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(date)
    .replace('.', '')
}

function SortButton({
  field,
  label,
  sortBy,
  direction,
  onSort,
}: {
  field: FolderSortField
  label: string
  sortBy: FolderSortField
  direction: 'asc' | 'desc'
  onSort: (field: FolderSortField) => void
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

function FolderMobileCard({ folder }: { folder: FolderItem }) {
  return (
    <Link
      href={`/folders/${folder.id}`}
      className="block w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md dark:border-white/10 dark:bg-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#f97316]">
            {folder.code}
          </span>
          <h3 className="mt-1 truncate font-bold text-slate-900 dark:text-white">{folder.title}</h3>
        </div>
        <FolderStatusBadge status={folder.status} className="shrink-0" />
      </div>
      <div className="mt-4 grid gap-2 text-sm text-slate-500">
        <span className="flex items-center gap-2">
          <BriefcaseBusiness className="size-4 text-slate-400" />
          {folder.client.name}
        </span>
        <span className="flex items-center gap-2">
          <UserRound className="size-4 text-slate-400" />
          {folder.responsible_lawyer?.full_name ?? 'Sem responsável'}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-white/10">
        <span>{folder.area}</span>
        <span>{formatDate(folder.created_at)}</span>
      </div>
    </Link>
  )
}

export function FolderList({ folders, sortBy, direction, onSort }: FolderListProps) {
  if (folders.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-orange-50 text-[#f97316] dark:bg-orange-500/10">
          <BriefcaseBusiness className="size-7" />
        </span>
        <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
          Nenhuma pasta encontrada
        </h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Ajuste os filtros ou cadastre a primeira pasta deste escritório.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid min-w-0 gap-3 p-4 md:hidden">
        {folders.map((folder) => (
          <FolderMobileCard key={folder.id} folder={folder} />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[13%]" />
            <col className="w-[14%]" />
            <col className="w-[9%]" />
            <col className="w-14" />
          </colgroup>
          <thead className="border-y border-slate-200/80 bg-slate-50/80 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.03]">
            <tr>
              <th className="px-5 py-3.5">
                <SortButton
                  field="code"
                  label="Pasta"
                  sortBy={sortBy}
                  direction={direction}
                  onSort={onSort}
                />
              </th>
              <th className="px-5 py-3.5">Cliente</th>
              <th className="px-5 py-3.5">Responsável</th>
              <th className="px-5 py-3.5">
                <SortButton
                  field="area"
                  label="Área"
                  sortBy={sortBy}
                  direction={direction}
                  onSort={onSort}
                />
              </th>
              <th className="px-5 py-3.5">
                <SortButton
                  field="created_at"
                  label="Criada em"
                  sortBy={sortBy}
                  direction={direction}
                  onSort={onSort}
                />
              </th>
              <th className="px-5 py-3.5">Status</th>
              <th className="w-16 px-5 py-3.5">
                <span className="sr-only">Abrir</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {folders.map((folder) => (
              <tr
                key={folder.id}
                className="group transition hover:bg-orange-50/30 dark:hover:bg-white/[0.025]"
              >
                <td className="px-5 py-4">
                  <Link href={`/folders/${folder.id}`} className="block min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-[0.08em] text-[#f97316]">
                      {folder.code}
                    </span>
                    <span className="mt-1 block max-w-[280px] truncate font-semibold text-slate-900 dark:text-white">
                      {folder.title}
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-emerald-50 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        {initialsOf(folder.client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <span className="block max-w-48 truncate font-medium text-slate-800 dark:text-slate-100">
                        {folder.client.name}
                      </span>
                      <span className="block text-xs text-slate-500">{folder.client.document}</span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  {folder.responsible_lawyer ? (
                    <div className="min-w-0">
                      <span className="block max-w-44 truncate font-medium text-slate-700 dark:text-slate-200">
                        {folder.responsible_lawyer.full_name}
                      </span>
                      <span className="block max-w-44 truncate text-xs text-slate-500">
                        {folder.responsible_lawyer.email}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">Sem responsável</span>
                  )}
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  <span className="block max-w-40 truncate">{folder.area}</span>
                  {folder.subarea && (
                    <span className="mt-0.5 block max-w-40 truncate text-xs text-slate-400">
                      {folder.subarea}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                  {formatDate(folder.created_at)}
                </td>
                <td className="px-5 py-4">
                  <FolderStatusBadge status={folder.status} />
                </td>
                <td className="px-5 py-4 text-right">
                  <Button
                    variant="ghost"
                    mode="icon"
                    asChild
                    aria-label={`Abrir pasta ${folder.code}`}
                  >
                    <Link href={`/folders/${folder.id}`}>
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
