import { Link, router } from '@inertiajs/react'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  FileSearch,
  Landmark,
  MapPin,
  Scale,
  Star,
  Trash2,
  UsersRound,
} from 'lucide-react'
import type { ReactNode } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import type { ProcessFolder, ProcessItem } from '~/types/process'
import {
  formatProcessCurrency,
  formatProcessDate,
  formatProcessIdentifier,
  processDistributionLabels,
  processInstanceLabels,
  processPartySideLabels,
  processPhaseLabels,
} from './process_formatters'
import { ProcessStatusBadge } from './process_status_badge'

interface ProcessDetailContentProps {
  folder: ProcessFolder
  process: ProcessItem
  successMessage?: string | null
  errorMessage?: string | null
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

function DetailPanel({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: typeof Scale
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-card ${className ?? ''}`}
    >
      <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10">
        <span className="flex size-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10">
          <Icon className="size-4" />
        </span>
        <h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

function yesNo(value: boolean | null) {
  if (value === null) return 'Não informado'
  return value ? 'Sim' : 'Não'
}

export function ProcessDetailContent({
  folder,
  process,
  successMessage,
  errorMessage,
}: ProcessDetailContentProps) {
  const processPath = `/folders/${folder.id}/processes/${process.id}`
  const identifier = formatProcessIdentifier(process)

  return (
    <div className="space-y-6" data-testid="process-detail">
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="size-4" />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle className="size-4" />
          {errorMessage}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Button variant="outline" mode="icon" asChild aria-label="Voltar para a pasta">
              <Link href={`/folders/${folder.id}`}>
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ProcessStatusBadge status={process.status} />
                {process.is_primary && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-[#f97316] dark:bg-orange-500/10">
                    <Star className="size-3.5 fill-current" />
                    Principal
                  </span>
                )}
              </div>
              <h1 className="mt-2 break-all font-mono text-xl font-black tracking-[-0.025em] text-slate-900 dark:text-white sm:text-2xl">
                {identifier}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Pasta {folder.code} · {folder.title}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!process.is_primary && (
              <Button
                variant="outline"
                onClick={() => router.put(`${processPath}/primary`, {}, { preserveScroll: true })}
              >
                <Star className="size-4" />
                Tornar principal
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`${processPath}/edit`}>
                <Edit3 className="size-4" />
                Editar
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" mode="icon" aria-label="Excluir processo">
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir este processo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O registro será removido da pasta, preservando o histórico relacionado para
                    auditoria.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => router.delete(processPath)}
                  >
                    Excluir processo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
          <DetailPanel icon={FileSearch} title="Identificação e classificação">
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Definition label="CNJ">
                {process.cnj_number ? identifier : 'Não informado'}
              </Definition>
              <Definition label="Número legado">
                {process.legacy_number ?? 'Não informado'}
              </Definition>
              <Definition label="Código interno">
                {process.internal_code ?? 'Não informado'}
              </Definition>
              <Definition label="Instância">
                {process.instance ? processInstanceLabels[process.instance] : 'Não informada'}
              </Definition>
              <Definition label="Fase">
                {process.phase ? processPhaseLabels[process.phase] : 'Não informada'}
              </Definition>
              <Definition label="Distribuição">
                {process.distribution_type
                  ? processDistributionLabels[process.distribution_type]
                  : 'Não informada'}
              </Definition>
              <Definition label="Natureza">{process.nature ?? 'Não informada'}</Definition>
              <Definition label="Tipo de ação">{process.action_type ?? 'Não informado'}</Definition>
              <Definition label="Eletrônico">{yesNo(process.electronic)}</Definition>
            </dl>
          </DetailPanel>

          <DetailPanel icon={Landmark} title="Órgão julgador">
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Definition label="Tribunal">{process.tribunal ?? 'Não informado'}</Definition>
              <Definition label="Órgão judicial">
                {process.judicial_body ?? 'Não informado'}
              </Definition>
              <Definition label="Comarca">{process.district ?? 'Não informada'}</Definition>
              <Definition label="Foro">{process.forum ?? 'Não informado'}</Definition>
              <Definition label="Vara">{process.court_division ?? 'Não informada'}</Definition>
              <Definition label="Juiz(a)">{process.judge ?? 'Não informado'}</Definition>
            </dl>
          </DetailPanel>

          <DetailPanel icon={UsersRound} title={`Partes (${process.parties.length})`}>
            {process.parties.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Nenhuma parte cadastrada para este processo.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/10">
                {process.parties.map((party) => (
                  <article
                    key={party.id}
                    className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {party.name}
                        </h3>
                        {party.is_primary && (
                          <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase text-[#f97316] dark:bg-orange-500/10">
                            Principal
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {[party.role, party.document].filter(Boolean).join(' · ') ||
                          'Sem papel ou documento informado'}
                      </p>
                    </div>
                    <span className="self-start rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
                      {processPartySideLabels[party.side]}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </DetailPanel>

          <DetailPanel icon={Scale} title="Contexto jurídico">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                  Observações
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {process.observation || 'Nenhuma observação registrada.'}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                  Objeto
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {process.object_detail || 'Nenhum detalhamento registrado.'}
                </p>
              </div>
            </div>
          </DetailPanel>
        </div>

        <div className="space-y-6">
          <DetailPanel icon={MapPin} title="Pasta e cliente">
            <dl className="grid gap-5">
              <Definition label="Pasta">
                <Link
                  href={`/folders/${folder.id}`}
                  className="text-cyan-700 hover:underline dark:text-cyan-300"
                >
                  {folder.code} · {folder.title}
                </Link>
              </Definition>
              <Definition label="Cliente">
                <Link
                  href={`/clients/${folder.client.id}`}
                  className="text-cyan-700 hover:underline dark:text-cyan-300"
                >
                  {folder.client.name}
                </Link>
              </Definition>
              <Definition label="Área">{folder.area}</Definition>
            </dl>
          </DetailPanel>

          <DetailPanel icon={CalendarDays} title="Marcos processuais">
            <dl className="grid gap-5">
              <Definition label="Distribuição">
                {formatProcessDate(process.distribution_date) ?? 'Não informada'}
              </Definition>
              <Definition label="Citação">
                {formatProcessDate(process.citation_date) ?? 'Não informada'}
              </Definition>
              <Definition label="Entrada">
                {formatProcessDate(process.entry_date) ?? 'Não informada'}
              </Definition>
              <Definition label="Cadastro">
                {formatProcessDate(process.created_at, true)}
              </Definition>
              <Definition label="Última atualização">
                {formatProcessDate(process.updated_at, true)}
              </Definition>
            </dl>
          </DetailPanel>

          <DetailPanel icon={CircleDollarSign} title="Valores">
            <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
              <Definition label="Valor da causa">
                {formatProcessCurrency(process.case_value) ?? 'Não informado'}
              </Definition>
              <Definition label="Condenação">
                {formatProcessCurrency(process.conviction_value) ?? 'Não informada'}
              </Definition>
              <Definition label="Custas">
                {formatProcessCurrency(process.costs) ?? 'Não informadas'}
              </Definition>
              <Definition label="Honorários">
                {formatProcessCurrency(process.fees) ?? 'Não informados'}
              </Definition>
            </dl>
          </DetailPanel>
        </div>
      </div>
    </div>
  )
}
