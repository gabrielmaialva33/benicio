import { Link, router } from '@inertiajs/react'
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Edit3,
  FileSearch,
  Landmark,
  MapPin,
  Scale,
  Star,
  UsersRound,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { DeleteDialog } from '~/components/shared/delete_dialog'
import { Button } from '~/components/ui/button'
import type { ProcessFolder, ProcessItem } from '~/types/process'
import {
  formatProcessCurrency,
  formatProcessDate,
  formatProcessIdentifier,
} from './process_formatters'
import { useActiveSection } from '~/hooks/use_active_section'
import {
  PROCESS_DISTRIBUTION_LABELS,
  PROCESS_INSTANCE_LABELS,
  PROCESS_PARTY_SIDE_LABELS,
  PROCESS_PHASE_LABELS,
} from '~/lib/labels'
import { cn } from '~/lib/utils'

import { ProcessStatusBadge } from './process_status_badge'

interface ProcessDetailContentProps {
  folder: ProcessFolder
  process: ProcessItem
}

function Definition({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{label}</dt>
      <dd className="mt-1.5 break-words text-sm font-medium text-slate-700">{children || '—'}</dd>
    </div>
  )
}

/**
 * Declared once outside the component: the observer hook keys off this array,
 * and a fresh literal each render would tear the observer down every time.
 */
const PROCESS_SECTIONS: Array<[string, string]> = [
  ['processo', 'Processo'],
  ['informacoes-gerais', 'Informações Gerais'],
  ['agenda', 'Agenda'],
  ['instancia', 'Instância'],
  ['verbas', 'Verbas'],
  ['partes', 'Partes'],
  ['cliente', 'Cliente'],
]

const PROCESS_SECTION_IDS = PROCESS_SECTIONS.map(([id]) => id)

function DetailPanel({
  id,
  icon: Icon,
  title,
  children,
  className,
}: {
  id?: string
  icon: typeof Scale
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 rounded-2xl border border-gray-100 bg-white shadow-[0_4px_4px_rgba(0,0,0,0.03)] ${className ?? ''}`}
    >
      <header className="flex items-center gap-3 border-b border-gray-100 px-6 py-5">
        <Icon className="size-5 text-yol-cyan" />
        <h2 className="text-lg font-semibold text-[#1f2a37]">{title}</h2>
      </header>
      <div className="p-6">{children}</div>
    </section>
  )
}

function yesNo(value: boolean | null) {
  if (value === null) return 'Não informado'
  return value ? 'Sim' : 'Não'
}

export function ProcessDetailContent({ folder, process }: ProcessDetailContentProps) {
  const processPath = `/folders/${folder.id}/processes/${process.id}`
  const activeSection = useActiveSection(PROCESS_SECTION_IDS)
  const identifier = formatProcessIdentifier(process)

  return (
    <div className="space-y-6" data-testid="process-detail">
      <section
        id="processo"
        className="scroll-mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_4px_rgba(0,0,0,0.03)] sm:p-8"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href={`/folders/${folder.id}`}
              aria-label="Voltar para a pasta"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-100"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ProcessStatusBadge status={process.status} />
                {process.is_primary && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-[#f97316]">
                    <Star className="size-3.5 fill-current" />
                    Principal
                  </span>
                )}
              </div>
              <h1 className="mt-2 break-all font-mono text-xl font-semibold text-[#1f2a37] sm:text-2xl">
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
            <DeleteDialog
              url={processPath}
              title="Excluir este processo?"
              description="O registro será removido da pasta, preservando o histórico relacionado para auditoria."
              confirmLabel="Excluir processo"
              triggerLabel="Excluir processo"
            />
          </div>
        </div>
      </section>

      <nav
        aria-label="Seções do processo"
        className="sticky top-0 z-10 overflow-x-auto rounded-2xl border border-gray-100 bg-white px-2 shadow-[0_4px_4px_rgba(0,0,0,0.03)]"
      >
        <div className="flex min-w-max">
          {PROCESS_SECTIONS.map(([id, label]) => {
            const active = activeSection === id
            return (
              <a
                key={id}
                href={`#${id}`}
                aria-current={active ? 'true' : undefined}
                onClick={(event) => {
                  // Native anchor jumping lands the heading under the sticky
                  // strip; scroll-margin plus a smooth scroll keeps it visible.
                  event.preventDefault()
                  document
                    .getElementById(id)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  history.replaceState(null, '', `#${id}`)
                }}
                className={cn(
                  'border-b-2 px-4 py-4 text-sm font-semibold transition hover:text-yol-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yol-cyan/40',
                  active
                    ? 'border-yol-cyan text-yol-cyan'
                    : 'border-transparent text-slate-500 hover:border-slate-200'
                )}
              >
                {label}
              </a>
            )
          })}
        </div>
      </nav>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
          <DetailPanel
            id="informacoes-gerais"
            icon={FileSearch}
            title="Identificação e classificação"
          >
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
                {process.instance ? PROCESS_INSTANCE_LABELS[process.instance] : 'Não informada'}
              </Definition>
              <Definition label="Fase">
                {process.phase ? PROCESS_PHASE_LABELS[process.phase] : 'Não informada'}
              </Definition>
              <Definition label="Distribuição">
                {process.distribution_type
                  ? PROCESS_DISTRIBUTION_LABELS[process.distribution_type]
                  : 'Não informada'}
              </Definition>
              <Definition label="Natureza">{process.nature ?? 'Não informada'}</Definition>
              <Definition label="Tipo de ação">{process.action_type ?? 'Não informado'}</Definition>
              <Definition label="Eletrônico">{yesNo(process.electronic)}</Definition>
            </dl>
          </DetailPanel>

          <DetailPanel id="instancia" icon={Landmark} title="Órgão julgador">
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

          <DetailPanel id="partes" icon={UsersRound} title={`Partes (${process.parties.length})`}>
            {process.parties.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Nenhuma parte cadastrada para este processo.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {process.parties.map((party) => (
                  <article
                    key={party.id}
                    className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[#1f2a37]">{party.name}</h3>
                        {party.is_primary && (
                          <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase text-[#f97316]">
                            Principal
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {[party.role, party.document].filter(Boolean).join(' · ') ||
                          'Sem papel ou documento informado'}
                      </p>
                    </div>
                    <span className="self-start rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700">
                      {PROCESS_PARTY_SIDE_LABELS[party.side]}
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
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {process.observation || 'Nenhuma observação registrada.'}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                  Objeto
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {process.object_detail || 'Nenhum detalhamento registrado.'}
                </p>
              </div>
            </div>
          </DetailPanel>
        </div>

        <div className="space-y-6">
          <DetailPanel id="cliente" icon={MapPin} title="Pasta e cliente">
            <dl className="grid gap-5">
              <Definition label="Pasta">
                <Link
                  href={`/folders/${folder.id}`}
                  className="text-yol-cyan-hover hover:underline"
                >
                  {folder.code} · {folder.title}
                </Link>
              </Definition>
              <Definition label="Cliente">
                <Link
                  href={`/clients/${folder.client.id}`}
                  className="text-yol-cyan-hover hover:underline"
                >
                  {folder.client.name}
                </Link>
              </Definition>
              <Definition label="Área">{folder.area}</Definition>
            </dl>
          </DetailPanel>

          <DetailPanel id="agenda" icon={CalendarDays} title="Marcos processuais">
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

          <DetailPanel id="verbas" icon={CircleDollarSign} title="Valores">
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
