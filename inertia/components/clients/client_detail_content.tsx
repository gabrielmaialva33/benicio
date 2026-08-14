import { Link, router } from '@inertiajs/react'
import {
  AlertTriangle,
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { ClientPersonBadge } from './client_person_badge'
import { formatClientDocument } from './client_list'
import { FolderStatusBadge } from '~/components/folders/folder_status_badge'
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
import type { ClientFolder, ClientItem } from '~/types/client'

interface ClientDetailContentProps {
  client: ClientItem
  folders: ClientFolder[]
  successMessage?: string | null
  errorMessage?: string | null
}

function Definition({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{label}</dt>
      <dd className="mt-1.5 break-words text-sm font-medium text-slate-700">{children || '—'}</dd>
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(value))
}

function addressLines(client: ClientItem) {
  const address = client.address
  if (!address) return []
  const street = [address.street, address.number].filter(Boolean).join(', ')
  const locality = [address.neighborhood, address.city, address.state].filter(Boolean).join(' · ')
  return [street, address.complement, locality, address.postal_code, address.country].filter(
    Boolean
  )
}

export function ClientDetailContent({
  client,
  folders,
  successMessage,
  errorMessage,
}: ClientDetailContentProps) {
  const address = addressLines(client)

  return (
    <div className="space-y-6" data-testid="client-detail">
      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="size-4" />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertTriangle className="size-4" />
          {errorMessage}
        </div>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_4px_rgba(0,0,0,0.03)] sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href="/clients"
              aria-label="Voltar para clientes"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-100"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ClientPersonBadge personType={client.person_type} />
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-[#1f2a37] sm:text-[28px]">
                {client.name}
              </h1>
              <p className="mt-2 font-mono text-sm text-slate-500">
                {formatClientDocument(client.document, client.person_type)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/clients/${client.id}/edit`}>
                <Edit3 className="size-4" />
                Editar
              </Link>
            </Button>
            <Button asChild className="bg-[#00b8d9] text-white shadow-none hover:bg-[#00a7c6]">
              <Link href={`/folders/create?client_id=${client.id}`}>
                <Plus className="size-4" />
                Nova pasta
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" mode="icon" aria-label="Excluir cliente">
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir {client.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O cliente será removido apenas se não possuir nenhuma pasta ativa. Esta ação não
                    apaga histórico jurídico.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => router.delete(`/clients/${client.id}`, { preserveScroll: true })}
                  >
                    Excluir cliente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_4px_4px_rgba(0,0,0,0.03)]">
          <span className="flex size-11 items-center justify-center rounded-lg bg-cyan-50 text-[#00b8d9]">
            <BriefcaseBusiness className="size-5" />
          </span>
          <span>
            <strong className="block text-2xl font-semibold text-[#1f2a37]">
              {client.folders_total}
            </strong>
            <span className="text-xs text-slate-500">Pastas vinculadas</span>
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_4px_4px_rgba(0,0,0,0.03)]">
          <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Building2 className="size-5" />
          </span>
          <span>
            <strong className="block text-2xl font-semibold text-[#1f2a37]">
              {client.active_folders}
            </strong>
            <span className="text-xs text-slate-500">Pastas ativas</span>
          </span>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="rounded-2xl border border-gray-100 bg-white shadow-[0_4px_4px_rgba(0,0,0,0.03)]">
          <header className="border-b border-gray-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-[#1f2a37]">Pastas do cliente</h2>
          </header>
          {folders.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
              <BriefcaseBusiness className="size-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-600">Nenhuma pasta vinculada.</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href={`/folders/create?client_id=${client.id}`}>
                  <Plus className="size-4" />
                  Abrir primeira pasta
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {folders.map((folder) => (
                <Link
                  key={folder.id}
                  href={`/folders/${folder.id}`}
                  className="flex items-start justify-between gap-4 px-6 py-4 transition hover:bg-cyan-50/30"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-black uppercase tracking-[0.1em] text-[#f97316]">
                      {folder.code}
                    </span>
                    <span className="mt-1 block truncate font-semibold text-[#1f2a37]">
                      {folder.title}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {folder.area}
                      {folder.subarea ? ` · ${folder.subarea}` : ''}
                    </span>
                  </span>
                  <FolderStatusBadge status={folder.status} className="shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_4px_rgba(0,0,0,0.03)]">
            <h2 className="text-lg font-semibold text-[#1f2a37]">Contato</h2>
            <dl className="mt-5 grid gap-5">
              <Definition label="E-mail">
                {client.email ? (
                  <a
                    href={`mailto:${client.email}`}
                    className="inline-flex items-center gap-2 text-[#00a7c6] hover:underline"
                  >
                    <Mail className="size-4" />
                    {client.email}
                  </a>
                ) : (
                  'Não informado'
                )}
              </Definition>
              <Definition label="Telefone">
                {client.phone ? (
                  <a
                    href={`tel:${client.phone}`}
                    className="inline-flex items-center gap-2 text-[#00a7c6] hover:underline"
                  >
                    <Phone className="size-4" />
                    {client.phone}
                  </a>
                ) : (
                  'Não informado'
                )}
              </Definition>
              <Definition label="Cadastro">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="size-4 text-slate-400" />
                  {formatDate(client.created_at)}
                </span>
              </Definition>
            </dl>
          </section>
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_4px_rgba(0,0,0,0.03)]">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1f2a37]">
              <MapPin className="size-4 text-slate-400" />
              Endereço
            </h2>
            {address.length > 0 ? (
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                {address.join('\n')}
              </p>
            ) : (
              <p className="mt-4 text-sm text-slate-400">Nenhum endereço informado.</p>
            )}
          </section>
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_4px_rgba(0,0,0,0.03)]">
            <h2 className="text-lg font-semibold text-[#1f2a37]">Observações</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {client.notes || 'Nenhuma observação interna.'}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
