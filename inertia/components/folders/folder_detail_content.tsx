import { Link } from '@inertiajs/react'
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  ListTodo,
  Plus,
  Scale,
  Search,
  UserRound,
} from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'

import { Button } from '~/components/ui/button'
import { APP_TIME_ZONE } from '~/lib/date'
import { cn } from '~/lib/utils'
import type {
  FolderActivity,
  FolderDeadline,
  FolderDetailStats,
  FolderItem,
  FolderProcess,
} from '~/types/folder'
import { FolderStatusBadge } from './folder_status_badge'

interface FolderDetailContentProps {
  folder: FolderItem
  stats: FolderDetailStats
  processes: FolderProcess[]
  deadlines: FolderDeadline[]
  activities: FolderActivity[]
  successMessage?: string | null
}

const processStatusLabels: Record<string, string> = {
  active: 'Ativo',
  suspended: 'Suspenso',
  archived: 'Arquivado',
  closed: 'Encerrado',
}

const instanceLabels: Record<string, string> = {
  first: '1ª instância',
  second: '2ª instância',
  superior: 'Tribunal superior',
}

const phaseLabels: Record<string, string> = {
  knowledge: 'Conhecimento',
  execution: 'Execução',
  appeal: 'Recurso',
  sentence_compliance: 'Cumprimento de sentença',
}

const detailSections = [
  { id: 'overview', label: 'Informações Gerais', icon: BriefcaseBusiness },
  { id: 'processes', label: 'Processos', icon: Scale },
  { id: 'deadlines', label: 'Prazos', icon: CalendarClock },
  { id: 'activity', label: 'Atividade', icon: ListTodo },
] as const

type DetailSection = (typeof detailSections)[number]['id']

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data inválida'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TIME_ZONE,
  })
    .format(date)
    .replace('.', '')
}

function formatCnj(value: string | null) {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 20) return value
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`
}

function formatCurrency(value: string | null) {
  if (!value) return null
  const number = Number(value)
  if (!Number.isFinite(number)) return value
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number)
}

function DetailCard({
  title,
  children,
  className,
  action,
}: {
  title: string
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-gray-100 bg-white shadow-[0_4px_4px_rgba(0,0,0,0.03)]',
        className
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-5">
        <h2 className="text-lg font-semibold text-[#1f2a37]">{title}</h2>
        {action}
      </header>
      <div className="p-6">{children}</div>
    </section>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof FolderOpen
  label: string
  value: number
  tone: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-[#f7f8f9] p-4">
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-lg', tone)}>
        <Icon className="size-5" />
      </span>
      <span>
        <strong className="block text-2xl font-semibold text-[#1f2a37]">{value}</strong>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </span>
    </div>
  )
}

function Definition({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{label}</dt>
      <dd className="mt-1.5 break-words text-sm font-medium text-slate-700">{children || '—'}</dd>
    </div>
  )
}

function ProcessCard({ folderId, process }: { folderId: number; process: FolderProcess }) {
  const number =
    formatCnj(process.cnj_number) ??
    process.legacy_number ??
    process.internal_code ??
    `#${process.id}`
  const primaryParties = process.parties.filter((party) => party.is_primary)

  return (
    <Link
      href={`/folders/${folderId}/processes/${process.id}`}
      className="block rounded-xl border border-gray-200 p-5 transition hover:border-yol-cyan hover:bg-cyan-50/30"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-[#1f2a37]">{number}</span>
            {process.is_primary && (
              <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase text-[#f97316]">
                Principal
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {[process.nature, process.action_type].filter(Boolean).join(' · ') ||
              'Sem natureza informada'}
          </p>
        </div>
        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
          {processStatusLabels[process.status] ?? process.status}
        </span>
      </div>

      <dl className="mt-4 grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-3">
        <Definition label="Instância">
          {process.instance ? (instanceLabels[process.instance] ?? process.instance) : '—'}
        </Definition>
        <Definition label="Fase">
          {process.phase ? (phaseLabels[process.phase] ?? process.phase) : '—'}
        </Definition>
        <Definition label="Tribunal">{process.tribunal ?? '—'}</Definition>
        <Definition label="Local">
          {[process.district, process.court_division].filter(Boolean).join(' · ') || '—'}
        </Definition>
        <Definition label="Valor da causa">{formatCurrency(process.case_value) ?? '—'}</Definition>
        <Definition label="Partes principais">
          {primaryParties.map((party) => party.name).join(' × ') || '—'}
        </Definition>
      </dl>
    </Link>
  )
}

function DeadlineRow({ deadline }: { deadline: FolderDeadline }) {
  const overdue = new Date(deadline.due_at).getTime() < Date.now()

  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          overdue || deadline.is_fatal ? 'bg-red-50 text-red-600' : 'bg-cyan-50 text-cyan-600'
        )}
      >
        <Clock3 className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
          {deadline.title}
          {deadline.is_fatal && (
            <span className="rounded bg-red-50 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-red-600">
              Fatal
            </span>
          )}
        </span>
        <span className={cn('mt-1 block text-xs', overdue ? 'text-red-600' : 'text-slate-500')}>
          {formatDateTime(deadline.due_at)}
          {deadline.assignee_name ? ` · ${deadline.assignee_name}` : ''}
        </span>
      </span>
    </li>
  )
}

function ActivityTimeline({ activities }: { activities: FolderActivity[] }) {
  if (activities.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Nenhuma atividade registrada.</p>
  }

  return (
    <ol>
      {activities.map((activity) => (
        <li
          key={activity.id}
          className="relative grid gap-1 pb-5 ps-7 last:pb-0 before:absolute before:start-[0.45rem] before:top-2 before:h-full before:w-px before:bg-gray-200 last:before:hidden"
        >
          <span className="absolute start-0 top-1.5 size-4 rounded-full border-4 border-white bg-yol-cyan ring-1 ring-cyan-100" />
          <span className="text-sm font-semibold text-slate-800">{activity.summary}</span>
          <span className="text-xs text-slate-500">
            {[activity.actor_name, formatDateTime(activity.occurred_at)]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </li>
      ))}
    </ol>
  )
}

export function FolderDetailContent({
  folder,
  stats,
  processes,
  deadlines,
  activities,
  successMessage,
}: FolderDetailContentProps) {
  const [activeSection, setActiveSection] = useState<DetailSection>('processes')
  const [navigationQuery, setNavigationQuery] = useState('')
  const visibleSections = useMemo(() => {
    const term = navigationQuery.trim().toLocaleLowerCase('pt-BR')
    if (!term) return detailSections
    return detailSections.filter((section) =>
      section.label.toLocaleLowerCase('pt-BR').includes(term)
    )
  }, [navigationQuery])

  return (
    <div className="space-y-6" data-testid="folder-detail">
      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="size-4" />
          {successMessage}
        </div>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_4px_rgba(0,0,0,0.03)] sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href="/folders"
              aria-label="Voltar para pastas"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-100"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <FolderStatusBadge status={folder.status} />
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-[#1f2a37] sm:text-[28px]">
                Pasta #<span>{folder.code}</span>
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                <span>{folder.title}</span> · Criada em {formatDateTime(folder.created_at)}
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            asChild
            className="h-11 rounded-lg bg-yol-cyan px-5 text-white shadow-none hover:bg-yol-cyan-hover"
          >
            <Link href={`/folders/${folder.id}/processes/create`}>
              <Plus className="size-4" />
              Novo processo
            </Link>
          </Button>
        </div>
      </section>

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <aside className="w-full shrink-0 rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_4px_rgba(0,0,0,0.03)] lg:w-72">
          <label className="relative block">
            <span className="sr-only">Filtrar seções da pasta</span>
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={navigationQuery}
              onChange={(event) => setNavigationQuery(event.target.value)}
              placeholder="Pesquisar"
              className="h-12 w-full rounded-lg border border-gray-300 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-yol-cyan focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <nav className="mt-5 space-y-2" aria-label="Seções da pasta">
            {visibleSections.map((section) => {
              const Icon = section.icon
              const active = activeSection === section.id
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition',
                    active
                      ? 'bg-yol-cyan text-white'
                      : 'text-gray-500 hover:bg-cyan-50 hover:text-yol-cyan-hover'
                  )}
                >
                  <Icon className="size-5" />
                  {section.label}
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          <div className={cn('space-y-6', activeSection !== 'overview' && 'hidden')}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={Scale}
                label="Processos"
                value={stats.processes_total}
                tone="bg-cyan-50 text-cyan-600"
              />
              <StatCard
                icon={ListTodo}
                label="Tarefas abertas"
                value={stats.tasks_open}
                tone="bg-orange-50 text-[#f97316]"
              />
              <StatCard
                icon={CalendarClock}
                label="Prazos abertos"
                value={stats.deadlines_open}
                tone="bg-red-50 text-red-600"
              />
              <StatCard
                icon={FileText}
                label="Documentos"
                value={stats.documents_total}
                tone="bg-emerald-50 text-emerald-600"
              />
            </div>

            <DetailCard title="Informações gerais">
              <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Definition label="Cliente">
                  <span className="flex items-center gap-2">
                    <BriefcaseBusiness className="size-4 text-slate-400" />
                    {folder.client.name}
                  </span>
                </Definition>
                <Definition label="Documento do cliente">{folder.client.document}</Definition>
                <Definition label="Área">{folder.area}</Definition>
                <Definition label="Subárea">{folder.subarea ?? '—'}</Definition>
                <Definition label="Responsável">
                  <span className="flex items-center gap-2">
                    <UserRound className="size-4 text-slate-400" />
                    {folder.responsible_lawyer?.full_name ?? 'Sem responsável definido'}
                  </span>
                </Definition>
                <Definition label="Atualizada em">{formatDateTime(folder.updated_at)}</Definition>
              </dl>
              <div className="mt-5 border-t border-gray-100 pt-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                  Descrição
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {folder.description || 'Nenhuma descrição registrada para esta pasta.'}
                </p>
              </div>
            </DetailCard>
          </div>

          <DetailCard
            title={`Processos vinculados (${stats.processes_total})`}
            className={activeSection !== 'processes' ? 'hidden' : undefined}
            action={
              <Button
                asChild
                size="sm"
                className="h-9 rounded-lg bg-yol-cyan px-4 text-white shadow-none hover:bg-yol-cyan-hover"
              >
                <Link href={`/folders/${folder.id}/processes/create`}>
                  <Plus className="size-4" />
                  Novo processo
                </Link>
              </Button>
            }
          >
            {processes.length === 0 ? (
              <div className="py-10 text-center">
                <Scale className="mx-auto size-8 text-slate-300" />
                <p className="mt-3 text-sm text-slate-400">
                  Nenhum processo vinculado a esta pasta.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {processes.map((process) => (
                  <ProcessCard key={process.id} folderId={folder.id} process={process} />
                ))}
              </div>
            )}
          </DetailCard>

          <DetailCard
            title="Prazos abertos"
            className={activeSection !== 'deadlines' ? 'hidden' : undefined}
          >
            {deadlines.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Nenhum prazo em aberto.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {deadlines.map((deadline) => (
                  <DeadlineRow key={deadline.id} deadline={deadline} />
                ))}
              </ul>
            )}
          </DetailCard>

          <DetailCard
            title="Atividade recente"
            className={activeSection !== 'activity' ? 'hidden' : undefined}
          >
            <ActivityTimeline activities={activities} />
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
