import { Link, useForm } from '@inertiajs/react'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  FileSearch,
  Landmark,
  Plus,
  Save,
  Scale,
  Trash2,
  UsersRound,
} from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'

import { Field } from '~/components/forms/field'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import type {
  ProcessDistributionType,
  ProcessFolder,
  ProcessInstance,
  ProcessItem,
  ProcessPartyPersonType,
  ProcessPartySide,
  ProcessPhase,
  ProcessStatus,
} from '~/types/process'

interface PartyFormData {
  side: ProcessPartySide
  role: string
  is_primary: boolean
  name: string
  document: string
  person_type: ProcessPartyPersonType | ''
}

interface ProcessFormData {
  cnj_number: string
  legacy_number: string
  internal_code: string
  status: ProcessStatus
  instance: ProcessInstance | ''
  phase: ProcessPhase | ''
  distribution_type: ProcessDistributionType | ''
  electronic: '' | 'true' | 'false'
  is_primary: boolean
  nature: string
  action_type: string
  tribunal: string
  judicial_body: string
  district: string
  forum: string
  court_division: string
  judge: string
  case_value: string
  conviction_value: string
  costs: string
  fees: string
  distribution_date: string
  citation_date: string
  entry_date: string
  observation: string
  object_detail: string
  parties: PartyFormData[]
}

function SectionHeader({
  icon: _icon,
  title,
  description,
  action,
}: {
  icon: typeof Scale
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <CardHeader className="min-h-0 border-0 bg-white px-8 pt-8">
      <div className="flex min-w-0 items-center gap-3">
        <div>
          <CardTitle className="text-lg text-[#161c24]">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </CardHeader>
  )
}

function SelectField({
  label,
  name,
  value,
  onChange,
  children,
  error,
}: {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
  error?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className="h-12 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#00b8d9] focus:ring-2 focus:ring-[#00b8d9]/20"
      >
        {children}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

const textFields = [
  'cnj_number',
  'legacy_number',
  'internal_code',
  'nature',
  'action_type',
  'tribunal',
  'judicial_body',
  'district',
  'forum',
  'court_division',
  'judge',
  'case_value',
  'conviction_value',
  'costs',
  'fees',
  'distribution_date',
  'citation_date',
  'entry_date',
  'observation',
  'object_detail',
] as const

function initialData(process?: ProcessItem): ProcessFormData {
  const data = Object.fromEntries(
    textFields.map((field) => [field, process?.[field] ?? ''])
  ) as Pick<ProcessFormData, (typeof textFields)[number]>

  return {
    ...data,
    status: process?.status ?? 'active',
    instance: process?.instance ?? '',
    phase: process?.phase ?? '',
    distribution_type: process?.distribution_type ?? '',
    electronic:
      process?.electronic === null || process?.electronic === undefined
        ? ''
        : (String(process.electronic) as 'true' | 'false'),
    is_primary: process?.is_primary ?? false,
    parties:
      process?.parties.map((party) => ({
        side: party.side,
        role: party.role ?? '',
        is_primary: party.is_primary,
        name: party.name,
        document: party.document ?? '',
        person_type: party.person_type ?? '',
      })) ?? [],
  }
}

export function ProcessForm({ folder, process }: { folder: ProcessFolder; process?: ProcessItem }) {
  const form = useForm<ProcessFormData>(initialData(process))
  const errors = form.errors as Record<string, string | undefined>
  const editing = Boolean(process)

  const setText = (field: (typeof textFields)[number], value: string) => {
    form.setData(field, value)
  }

  const addParty = () => {
    form.setData('parties', [
      ...form.data.parties,
      {
        side: form.data.parties.some((party) => party.side === 'active') ? 'passive' : 'active',
        role: '',
        is_primary: false,
        name: '',
        document: '',
        person_type: '',
      },
    ])
  }

  const updateParty = <FieldName extends keyof PartyFormData>(
    index: number,
    field: FieldName,
    value: PartyFormData[FieldName]
  ) => {
    const current = form.data.parties[index]
    if (!current) return
    const side = field === 'side' ? (value as ProcessPartySide) : current.side

    form.setData(
      'parties',
      form.data.parties.map((party, partyIndex) => {
        if (partyIndex === index) return { ...party, [field]: value }
        if (
          (field === 'is_primary' && value === true) ||
          (field === 'side' && current.is_primary)
        ) {
          return party.side === side ? { ...party, is_primary: false } : party
        }
        return party
      })
    )
  }

  const removeParty = (index: number) => {
    form.setData(
      'parties',
      form.data.parties.filter((_, partyIndex) => partyIndex !== index)
    )
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    form.transform((data) => ({
      ...data,
      ...Object.fromEntries(textFields.map((field) => [field, data[field] || null])),
      instance: data.instance || null,
      phase: data.phase || null,
      distribution_type: data.distribution_type || null,
      electronic: data.electronic === '' ? null : data.electronic === 'true',
      parties: data.parties.map((party) => ({
        ...party,
        role: party.role || null,
        document: party.document || null,
        person_type: party.person_type || null,
      })),
    }))

    if (process) {
      form.put(`/folders/${folder.id}/processes/${process.id}`)
    } else {
      form.post(`/folders/${folder.id}/processes`)
    }
  }

  const cancelPath = process
    ? `/folders/${folder.id}/processes/${process.id}`
    : `/folders/${folder.id}`

  return (
    <form onSubmit={submit} className="space-y-8" data-testid="process-form">
      {(errors.general || errors.parties) && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.general ?? errors.parties}
        </p>
      )}

      <Card className="overflow-hidden rounded-2xl border-gray-100 shadow-sm">
        <SectionHeader
          icon={FileSearch}
          title="Identificação e classificação"
          description="Use ao menos um identificador para o processo."
        />
        <CardContent className="grid gap-6 px-8 pb-8 pt-6 md:grid-cols-2 xl:grid-cols-3 [&_[data-slot=input]]:h-12 [&_[data-slot=input]]:rounded-lg [&_[data-slot=input]]:border-gray-300 [&_[data-slot=input]]:px-4">
          <Field
            label="Número CNJ"
            name="cnj_number"
            value={form.data.cnj_number}
            onChange={(event) => setText('cnj_number', event.target.value)}
            error={errors.cnj_number}
            placeholder="0000000-00.0000.0.00.0000"
            maxLength={32}
          />
          <Field
            label="Número legado"
            name="legacy_number"
            value={form.data.legacy_number}
            onChange={(event) => setText('legacy_number', event.target.value)}
            error={errors.legacy_number}
            maxLength={80}
          />
          <Field
            label="Código interno"
            name="internal_code"
            value={form.data.internal_code}
            onChange={(event) => setText('internal_code', event.target.value.toUpperCase())}
            error={errors.internal_code}
            maxLength={80}
          />
          <SelectField
            label="Status"
            name="status"
            value={form.data.status}
            onChange={(value) => form.setData('status', value as ProcessStatus)}
            error={errors.status}
          >
            <option value="active">Ativo</option>
            <option value="suspended">Suspenso</option>
            <option value="archived">Arquivado</option>
            <option value="closed">Encerrado</option>
          </SelectField>
          <SelectField
            label="Instância"
            name="instance"
            value={form.data.instance}
            onChange={(value) => form.setData('instance', value as ProcessInstance | '')}
            error={errors.instance}
          >
            <option value="">Não informada</option>
            <option value="first">1ª instância</option>
            <option value="second">2ª instância</option>
            <option value="superior">Tribunal superior</option>
          </SelectField>
          <SelectField
            label="Fase"
            name="phase"
            value={form.data.phase}
            onChange={(value) => form.setData('phase', value as ProcessPhase | '')}
            error={errors.phase}
          >
            <option value="">Não informada</option>
            <option value="knowledge">Conhecimento</option>
            <option value="execution">Execução</option>
            <option value="appeal">Recurso</option>
            <option value="sentence_compliance">Cumprimento de sentença</option>
          </SelectField>
          <Field
            label="Natureza"
            name="nature"
            value={form.data.nature}
            onChange={(event) => setText('nature', event.target.value)}
            error={errors.nature}
            maxLength={120}
          />
          <Field
            label="Tipo de ação"
            name="action_type"
            value={form.data.action_type}
            onChange={(event) => setText('action_type', event.target.value)}
            error={errors.action_type}
            maxLength={160}
          />
          <SelectField
            label="Distribuição"
            name="distribution_type"
            value={form.data.distribution_type}
            onChange={(value) =>
              form.setData('distribution_type', value as ProcessDistributionType | '')
            }
            error={errors.distribution_type}
          >
            <option value="">Não informada</option>
            <option value="lottery">Sorteio</option>
            <option value="dependency">Dependência</option>
            <option value="prevention">Prevenção</option>
          </SelectField>
          <SelectField
            label="Processo eletrônico"
            name="electronic"
            value={form.data.electronic}
            onChange={(value) => form.setData('electronic', value as '' | 'true' | 'false')}
            error={errors.electronic}
          >
            <option value="">Não informado</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </SelectField>
          <label className="flex min-h-12 items-center gap-3 self-end rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium">
            <input
              type="checkbox"
              name="is_primary"
              checked={form.data.is_primary}
              onChange={(event) => form.setData('is_primary', event.target.checked)}
              className="size-4 rounded border-slate-300 accent-[#00b8d9]"
            />
            Processo principal da pasta
          </label>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-gray-100 shadow-sm">
        <SectionHeader
          icon={Landmark}
          title="Órgão julgador"
          description="Localização e autoridade responsável pelo processo."
        />
        <CardContent className="grid gap-6 px-8 pb-8 pt-6 md:grid-cols-2 xl:grid-cols-3 [&_[data-slot=input]]:h-12 [&_[data-slot=input]]:rounded-lg [&_[data-slot=input]]:border-gray-300 [&_[data-slot=input]]:px-4">
          <Field
            label="Tribunal"
            name="tribunal"
            value={form.data.tribunal}
            onChange={(event) => setText('tribunal', event.target.value)}
            error={errors.tribunal}
            maxLength={160}
          />
          <Field
            label="Órgão judicial"
            name="judicial_body"
            value={form.data.judicial_body}
            onChange={(event) => setText('judicial_body', event.target.value)}
            error={errors.judicial_body}
            maxLength={160}
          />
          <Field
            label="Comarca"
            name="district"
            value={form.data.district}
            onChange={(event) => setText('district', event.target.value)}
            error={errors.district}
            maxLength={160}
          />
          <Field
            label="Foro"
            name="forum"
            value={form.data.forum}
            onChange={(event) => setText('forum', event.target.value)}
            error={errors.forum}
            maxLength={160}
          />
          <Field
            label="Vara"
            name="court_division"
            value={form.data.court_division}
            onChange={(event) => setText('court_division', event.target.value)}
            error={errors.court_division}
            maxLength={160}
          />
          <Field
            label="Juiz(a)"
            name="judge"
            value={form.data.judge}
            onChange={(event) => setText('judge', event.target.value)}
            error={errors.judge}
            maxLength={160}
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-gray-100 shadow-sm">
        <SectionHeader
          icon={CalendarDays}
          title="Datas e valores"
          description="Marcos processuais e valores preservados com precisão decimal."
        />
        <CardContent className="grid gap-6 px-8 pb-8 pt-6 md:grid-cols-2 xl:grid-cols-4 [&_[data-slot=input]]:h-12 [&_[data-slot=input]]:rounded-lg [&_[data-slot=input]]:border-gray-300 [&_[data-slot=input]]:px-4">
          <Field
            label="Distribuição"
            name="distribution_date"
            type="date"
            value={form.data.distribution_date}
            onChange={(event) => setText('distribution_date', event.target.value)}
            error={errors.distribution_date}
          />
          <Field
            label="Citação"
            name="citation_date"
            type="date"
            value={form.data.citation_date}
            onChange={(event) => setText('citation_date', event.target.value)}
            error={errors.citation_date}
          />
          <Field
            label="Entrada"
            name="entry_date"
            type="date"
            value={form.data.entry_date}
            onChange={(event) => setText('entry_date', event.target.value)}
            error={errors.entry_date}
          />
          <div className="hidden xl:block" />
          <Field
            label="Valor da causa"
            name="case_value"
            inputMode="decimal"
            value={form.data.case_value}
            onChange={(event) => setText('case_value', event.target.value.replace(',', '.'))}
            error={errors.case_value}
            placeholder="0.00"
          />
          <Field
            label="Condenação"
            name="conviction_value"
            inputMode="decimal"
            value={form.data.conviction_value}
            onChange={(event) => setText('conviction_value', event.target.value.replace(',', '.'))}
            error={errors.conviction_value}
            placeholder="0.00"
          />
          <Field
            label="Custas"
            name="costs"
            inputMode="decimal"
            value={form.data.costs}
            onChange={(event) => setText('costs', event.target.value.replace(',', '.'))}
            error={errors.costs}
            placeholder="0.00"
          />
          <Field
            label="Honorários"
            name="fees"
            inputMode="decimal"
            value={form.data.fees}
            onChange={(event) => setText('fees', event.target.value.replace(',', '.'))}
            error={errors.fees}
            placeholder="0.00"
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-gray-100 shadow-sm">
        <SectionHeader
          icon={UsersRound}
          title="Partes"
          description="Cadastre polos e marque no máximo uma parte principal por lado."
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addParty}
              className="rounded-full border-[#00b8d9]/50 font-bold text-[#00b8d9] hover:bg-[#00b8d9]/5 hover:text-[#00b8d9]"
            >
              <Plus className="size-4" />
              Adicionar parte
            </Button>
          }
        />
        <CardContent className="space-y-4 px-8 pb-8 pt-6">
          {form.data.parties.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
              <UsersRound className="mx-auto size-8 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">Nenhuma parte cadastrada.</p>
            </div>
          ) : (
            form.data.parties.map((party, index) => (
              <div
                key={index}
                data-testid="process-party-row"
                className="grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-[170px_minmax(180px,1fr)_160px_minmax(170px,1fr)_auto]"
              >
                <SelectField
                  label="Polo"
                  name={`parties.${index}.side`}
                  value={party.side}
                  onChange={(value) => updateParty(index, 'side', value as ProcessPartySide)}
                  error={errors[`parties.${index}.side`]}
                >
                  <option value="active">Ativo</option>
                  <option value="passive">Passivo</option>
                  <option value="third">Terceiro</option>
                  <option value="other">Outro</option>
                </SelectField>
                <Field
                  label="Nome"
                  name={`parties.${index}.name`}
                  value={party.name}
                  onChange={(event) => updateParty(index, 'name', event.target.value)}
                  error={errors[`parties.${index}.name`]}
                  maxLength={255}
                  required
                />
                <SelectField
                  label="Pessoa"
                  name={`parties.${index}.person_type`}
                  value={party.person_type}
                  onChange={(value) =>
                    updateParty(index, 'person_type', value as ProcessPartyPersonType | '')
                  }
                  error={errors[`parties.${index}.person_type`]}
                >
                  <option value="">Não informada</option>
                  <option value="individual">Física</option>
                  <option value="company">Jurídica</option>
                </SelectField>
                <Field
                  label="Documento"
                  name={`parties.${index}.document`}
                  value={party.document}
                  onChange={(event) =>
                    updateParty(index, 'document', event.target.value.toUpperCase())
                  }
                  error={errors[`parties.${index}.document`]}
                  maxLength={32}
                />
                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  className="self-end text-red-500"
                  aria-label={`Remover parte ${index + 1}`}
                  onClick={() => removeParty(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
                <Field
                  label="Papel no processo"
                  name={`parties.${index}.role`}
                  value={party.role}
                  onChange={(event) => updateParty(index, 'role', event.target.value)}
                  error={errors[`parties.${index}.role`]}
                  maxLength={80}
                  className="md:col-span-1 xl:col-span-2"
                />
                <label className="flex min-h-10 items-center gap-3 self-end rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium md:col-span-1 xl:col-span-2">
                  <input
                    type="checkbox"
                    name={`parties.${index}.is_primary`}
                    checked={party.is_primary}
                    onChange={(event) => updateParty(index, 'is_primary', event.target.checked)}
                    className="size-4 rounded border-slate-300 accent-[#00b8d9]"
                  />
                  Parte principal deste polo
                </label>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-gray-100 shadow-sm">
        <SectionHeader
          icon={Building2}
          title="Contexto jurídico"
          description="Informações internas para leitura rápida do caso."
        />
        <CardContent className="grid gap-6 px-8 pb-8 pt-6 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="observation">Observações</Label>
            <Textarea
              id="observation"
              name="observation"
              value={form.data.observation}
              onChange={(event) => setText('observation', event.target.value)}
              className="min-h-36 rounded-lg border-gray-300 focus-visible:border-[#00b8d9] focus-visible:ring-[#00b8d9]/20"
              maxLength={10_000}
            />
            {errors.observation && <p className="text-xs text-destructive">{errors.observation}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="object_detail">Detalhamento do objeto</Label>
            <Textarea
              id="object_detail"
              name="object_detail"
              value={form.data.object_detail}
              onChange={(event) => setText('object_detail', event.target.value)}
              className="min-h-36 rounded-lg border-gray-300 focus-visible:border-[#00b8d9] focus-visible:ring-[#00b8d9]/20"
              maxLength={10_000}
            />
            {errors.object_detail && (
              <p className="text-xs text-destructive">{errors.object_detail}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-4 border-0 bg-white px-8 pb-8">
          <Button
            variant="outline"
            type="button"
            asChild
            className="h-12 rounded-lg px-6 font-semibold text-[#637381]"
          >
            <Link href={cancelPath}>
              <ArrowLeft className="size-4" />
              Cancelar
            </Link>
          </Button>
          <Button
            type="submit"
            disabled={form.processing}
            className="h-12 rounded-lg bg-[#00b8d9] px-6 font-semibold text-white hover:bg-[#00a6c5]"
          >
            <Save className="size-4" />
            {form.processing ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar processo'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
