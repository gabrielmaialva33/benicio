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
  UserRound,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '~/components/ui/button'
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

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data inválida'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
        'rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-card',
        className
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10">
        <h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
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
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-card">
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', tone)}>
        <Icon className="size-5" />
      </span>
      <span>
        <strong className="block text-2xl font-black tracking-[-0.04em] text-slate-900 dark:text-white">
          {value}
        </strong>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </span>
    </div>
  )
}

function Definition({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{label}</dt>
      <dd className="mt-1.5 break-words text-sm font-medium text-slate-700 dark:text-slate-200">
        {children || '—'}
      </dd>
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
      className="block rounded-xl border border-slate-100 p-4 transition hover:border-orange-200 hover:bg-orange-50/30 dark:border-white/10 dark:hover:border-orange-500/20 dark:hover:bg-white/[0.025]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
              {number}
            </span>
            {process.is_primary && (
              <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase text-[#f97316] dark:bg-orange-500/10">
                Principal
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {[process.nature, process.action_type].filter(Boolean).join(' · ') ||
              'Sem natureza informada'}
          </p>
        </div>
        <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
          {processStatusLabels[process.status] ?? process.status}
        </span>
      </div>

      <dl className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3 dark:border-white/10">
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
          'flex size-9 shrink-0 items-center justify-center rounded-xl',
          overdue || deadline.is_fatal
            ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300'
            : 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300'
        )}
      >
        <Clock3 className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
          {deadline.title}
          {deadline.is_fatal && (
            <span className="rounded bg-red-50 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-red-600 dark:bg-red-500/10">
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
          className="relative grid gap-1 pb-5 ps-7 last:pb-0 before:absolute before:start-[0.45rem] before:top-2 before:h-full before:w-px before:bg-slate-200 last:before:hidden dark:before:bg-white/10"
        >
          <span className="absolute start-0 top-1.5 size-4 rounded-full border-4 border-white bg-cyan-500 ring-1 ring-cyan-100 dark:border-card dark:ring-cyan-500/20" />
          <span className="text-sm font-semibold text-slate-800 dark:text-white">
            {activity.summary}
          </span>
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
  return (
    <div className="space-y-6" data-testid="folder-detail">
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="size-4" />
          {successMessage}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Button variant="outline" mode="icon" asChild aria-label="Voltar para pastas">
              <Link href="/folders">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-sm font-black uppercase tracking-[0.12em] text-[#f97316]">
                  {folder.code}
                </span>
                <FolderStatusBadge status={folder.status} />
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-900 dark:text-white sm:text-3xl">
                {folder.title}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Criada em {formatDateTime(folder.created_at)}
              </p>
            </div>
          </div>
          <Button variant="primary" asChild className="bg-[#f97316] text-white hover:bg-[#ea680c]">
            <Link href="/folders/create">
              <BriefcaseBusiness className="size-4" />
              Nova pasta
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Scale}
          label="Processos"
          value={stats.processes_total}
          tone="bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10"
        />
        <StatCard
          icon={ListTodo}
          label="Tarefas abertas"
          value={stats.tasks_open}
          tone="bg-orange-50 text-[#f97316] dark:bg-orange-500/10"
        />
        <StatCard
          icon={CalendarClock}
          label="Prazos abertos"
          value={stats.deadlines_open}
          tone="bg-red-50 text-red-600 dark:bg-red-500/10"
        />
        <StatCard
          icon={FileText}
          label="Documentos"
          value={stats.documents_total}
          tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
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
            <div className="mt-5 border-t border-slate-100 pt-5 dark:border-white/10">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                Descrição
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                {folder.description || 'Nenhuma descrição registrada para esta pasta.'}
              </p>
            </div>
          </DetailCard>

          <DetailCard
            title={`Processos vinculados (${stats.processes_total})`}
            action={
              <Button asChild size="sm" className="bg-[#f97316] text-white hover:bg-[#ea680c]">
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
        </div>

        <div className="space-y-6">
          <DetailCard title="Prazos abertos">
            {deadlines.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Nenhum prazo em aberto.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/10">
                {deadlines.map((deadline) => (
                  <DeadlineRow key={deadline.id} deadline={deadline} />
                ))}
              </ul>
            )}
          </DetailCard>

          <DetailCard title="Atividade recente">
            <ActivityTimeline activities={activities} />
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
