import { Link, useForm } from '@inertiajs/react'
import { AlertCircle, ArrowLeft, BriefcaseBusiness, Save } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { Field } from '~/components/forms/field'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import type { FolderFormOptions, FolderStatus } from '~/types/folder'

interface FolderFormData {
  code: string
  title: string
  description: string
  status: FolderStatus
  area: string
  subarea: string
  client_id: string
  responsible_lawyer_id: string
}

function SelectField({
  id,
  label,
  value,
  onChange,
  error,
  required,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive"
      >
        {children}
      </select>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export function FolderForm({ clients, lawyers, areas }: FolderFormOptions) {
  const form = useForm<FolderFormData>({
    code: '',
    title: '',
    description: '',
    status: 'active',
    area: '',
    subarea: '',
    client_id: '',
    responsible_lawyer_id: '',
  })
  const hasClients = clients.length > 0

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    form.transform((data) => ({
      ...data,
      client_id: Number(data.client_id),
      responsible_lawyer_id: data.responsible_lawyer_id ? Number(data.responsible_lawyer_id) : null,
      description: data.description || null,
      subarea: data.subarea || null,
    }))
    form.post('/folders')
  }

  return (
    <form onSubmit={submit} className="space-y-6" data-testid="folder-create-form">
      {!hasClients && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>É preciso ter ao menos um cliente cadastrado neste escritório para abrir uma pasta.</p>
        </div>
      )}

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="min-h-16 bg-slate-50/60 dark:bg-white/[0.025]">
          <div>
            <CardTitle>Identificação da pasta</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Dados usados para localizar e organizar o caso no escritório.
            </p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-orange-50 text-[#f97316] dark:bg-orange-500/10">
            <BriefcaseBusiness className="size-5" />
          </span>
        </CardHeader>
        <CardContent className="grid gap-5 pt-6 md:grid-cols-2 xl:grid-cols-3">
          <Field
            label="Código da pasta"
            name="code"
            value={form.data.code}
            onChange={(event) => form.setData('code', event.target.value.toUpperCase())}
            error={form.errors.code}
            placeholder="Ex.: CIV-2026-001"
            maxLength={80}
            required
          />
          <Field
            label="Título"
            name="title"
            value={form.data.title}
            onChange={(event) => form.setData('title', event.target.value)}
            error={form.errors.title}
            placeholder="Resumo claro do caso"
            maxLength={255}
            className="xl:col-span-2"
            required
          />
          <Field
            label="Área"
            name="area"
            value={form.data.area}
            onChange={(event) => form.setData('area', event.target.value)}
            error={form.errors.area}
            placeholder="Ex.: Cível"
            list="folder-area-options"
            maxLength={120}
            required
          />
          <datalist id="folder-area-options">
            {areas.map((area) => (
              <option key={area} value={area} />
            ))}
          </datalist>
          <Field
            label="Subárea"
            name="subarea"
            value={form.data.subarea}
            onChange={(event) => form.setData('subarea', event.target.value)}
            error={form.errors.subarea}
            placeholder="Ex.: Contratos"
            maxLength={120}
          />
          <SelectField
            id="status"
            label="Status inicial"
            value={form.data.status}
            onChange={(value) => form.setData('status', value as FolderStatus)}
            error={form.errors.status}
            required
          >
            <option value="active">Ativa</option>
            <option value="pending">Pendente</option>
            <option value="completed">Concluída</option>
            <option value="archived">Arquivada</option>
            <option value="cancelled">Cancelada</option>
          </SelectField>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="min-h-16 bg-slate-50/60 dark:bg-white/[0.025]">
          <div>
            <CardTitle>Cliente e responsabilidade</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              As opções já chegam filtradas pelo escritório ativo.
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 pt-6 md:grid-cols-2">
          <SelectField
            id="client_id"
            label="Cliente"
            value={form.data.client_id}
            onChange={(value) => form.setData('client_id', value)}
            error={form.errors.client_id}
            required
          >
            <option value="">Selecione um cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} · {client.document}
              </option>
            ))}
          </SelectField>
          <SelectField
            id="responsible_lawyer_id"
            label="Advogado responsável"
            value={form.data.responsible_lawyer_id}
            onChange={(value) => form.setData('responsible_lawyer_id', value)}
            error={form.errors.responsible_lawyer_id}
          >
            <option value="">Sem responsável definido</option>
            {lawyers.map((lawyer) => (
              <option key={lawyer.id} value={lawyer.id}>
                {lawyer.full_name} · {lawyer.email}
              </option>
            ))}
          </SelectField>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="min-h-16 bg-slate-50/60 dark:bg-white/[0.025]">
          <div>
            <CardTitle>Contexto</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Registre o objeto da pasta sem misturar dados próprios do processo judicial.
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              value={form.data.description}
              onChange={(event) => form.setData('description', event.target.value)}
              aria-invalid={!!form.errors.description}
              aria-describedby={form.errors.description ? 'description-error' : undefined}
              placeholder="Contexto, objetivo e observações gerais da pasta"
              className="min-h-32 resize-y"
              maxLength={10000}
            />
            {form.errors.description && (
              <p id="description-error" className="text-xs text-destructive">
                {form.errors.description}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-3 bg-slate-50/40 py-4 dark:bg-white/[0.02]">
          <Button variant="outline" type="button" asChild>
            <Link href="/folders">
              <ArrowLeft className="size-4" />
              Cancelar
            </Link>
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={form.processing || !hasClients}
            className="bg-[#f97316] text-white hover:bg-[#ea680c]"
          >
            <Save className="size-4" />
            {form.processing ? 'Salvando...' : 'Salvar pasta'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
