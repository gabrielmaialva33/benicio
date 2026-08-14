import { Link, useForm } from '@inertiajs/react'
import { ArrowLeft, Building2, MapPin, Save, StickyNote, UserRound } from 'lucide-react'

import { Field } from '~/components/forms/field'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import type { ClientItem, ClientPersonType } from '~/types/client'
import { NativeSelect } from '~/components/ui/native-select'

interface ClientFormData {
  name: string
  document: string
  person_type: ClientPersonType
  email: string
  phone: string
  address: {
    street: string
    number: string
    complement: string
    neighborhood: string
    city: string
    state: string
    postal_code: string
    country: string
  }
  notes: string
}

const emptyAddress: ClientFormData['address'] = {
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'BR',
}

export function ClientForm({ client }: { client?: ClientItem }) {
  const form = useForm<ClientFormData>({
    name: client?.name ?? '',
    document: client?.document ?? '',
    person_type: client?.person_type ?? 'individual',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    address: client?.address
      ? {
          street: client.address.street ?? '',
          number: client.address.number ?? '',
          complement: client.address.complement ?? '',
          neighborhood: client.address.neighborhood ?? '',
          city: client.address.city ?? '',
          state: client.address.state ?? '',
          postal_code: client.address.postal_code ?? '',
          country: client.address.country ?? 'BR',
        }
      : emptyAddress,
    notes: client?.notes ?? '',
  })
  const errors = form.errors as Record<string, string | undefined>
  const editing = Boolean(client)

  const updateAddress = (field: keyof ClientFormData['address'], value: string) => {
    form.setData('address', { ...form.data.address, [field]: value })
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    form.transform((data) => ({
      ...data,
      email: data.email || null,
      phone: data.phone || null,
      notes: data.notes || null,
      address: Object.fromEntries(
        Object.entries(data.address).map(([key, value]) => [key, value || null])
      ),
    }))
    if (client) {
      form.put(`/clients/${client.id}`)
    } else {
      form.post('/clients')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" data-testid="client-form">
      {errors.general && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.general}
        </p>
      )}

      <Card className="overflow-hidden rounded-2xl border-gray-100">
        <CardHeader className="min-h-0 bg-white px-8 pt-8">
          <div>
            <CardTitle>Identificação e contato</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Dados usados em pastas, processos e comunicações do escritório.
            </p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-lg bg-cyan-50 text-yol-cyan">
            {form.data.person_type === 'company' ? (
              <Building2 className="size-5" />
            ) : (
              <UserRound className="size-5" />
            )}
          </span>
        </CardHeader>
        <CardContent className="grid gap-6 px-8 pb-8 pt-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="person_type">Tipo de pessoa</Label>
            <NativeSelect
              id="person_type"
              name="person_type"
              value={form.data.person_type}
              onChange={(event) =>
                form.setData('person_type', event.target.value as ClientPersonType)
              }
              selectSize="lg"
            >
              <option value="individual">Pessoa física</option>
              <option value="company">Pessoa jurídica</option>
            </NativeSelect>
            {errors.person_type && <p className="text-xs text-destructive">{errors.person_type}</p>}
          </div>
          <Field
            label="Nome completo ou razão social"
            name="name"
            value={form.data.name}
            onChange={(event) => form.setData('name', event.target.value)}
            error={errors.name}
            maxLength={255}
            required
            className="xl:col-span-2"
          />
          <Field
            label={form.data.person_type === 'company' ? 'CNPJ' : 'CPF'}
            name="document"
            value={form.data.document}
            onChange={(event) => form.setData('document', event.target.value.toUpperCase())}
            error={errors.document}
            hint={
              form.data.person_type === 'company'
                ? 'Aceita o CNPJ alfanumérico previsto pela Receita.'
                : 'Informe os 11 dígitos do CPF.'
            }
            maxLength={32}
            required
          />
          <Field
            label="E-mail"
            name="email"
            type="email"
            value={form.data.email}
            onChange={(event) => form.setData('email', event.target.value)}
            error={errors.email}
            maxLength={254}
          />
          <Field
            label="Telefone"
            name="phone"
            value={form.data.phone}
            onChange={(event) => form.setData('phone', event.target.value)}
            error={errors.phone}
            maxLength={32}
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-gray-100">
        <CardHeader className="min-h-0 bg-white px-8 pt-8">
          <div>
            <CardTitle>Endereço</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Opcional, mas útil para contratos e documentos.
            </p>
          </div>
          <MapPin className="size-5 text-slate-400" />
        </CardHeader>
        <CardContent className="grid gap-6 px-8 pb-8 pt-6 md:grid-cols-2 xl:grid-cols-4">
          <Field
            label="CEP"
            name="address.postal_code"
            value={form.data.address.postal_code}
            onChange={(event) => updateAddress('postal_code', event.target.value)}
            error={errors['address.postal_code']}
            maxLength={20}
          />
          <Field
            label="Rua"
            name="address.street"
            value={form.data.address.street}
            onChange={(event) => updateAddress('street', event.target.value)}
            error={errors['address.street']}
            maxLength={255}
            className="xl:col-span-2"
          />
          <Field
            label="Número"
            name="address.number"
            value={form.data.address.number}
            onChange={(event) => updateAddress('number', event.target.value)}
            error={errors['address.number']}
            maxLength={40}
          />
          <Field
            label="Complemento"
            name="address.complement"
            value={form.data.address.complement}
            onChange={(event) => updateAddress('complement', event.target.value)}
            error={errors['address.complement']}
            maxLength={120}
          />
          <Field
            label="Bairro"
            name="address.neighborhood"
            value={form.data.address.neighborhood}
            onChange={(event) => updateAddress('neighborhood', event.target.value)}
            error={errors['address.neighborhood']}
            maxLength={120}
          />
          <Field
            label="Cidade"
            name="address.city"
            value={form.data.address.city}
            onChange={(event) => updateAddress('city', event.target.value)}
            error={errors['address.city']}
            maxLength={120}
          />
          <Field
            label="Estado"
            name="address.state"
            value={form.data.address.state}
            onChange={(event) => updateAddress('state', event.target.value.toUpperCase())}
            error={errors['address.state']}
            maxLength={80}
          />
          <Field
            label="País"
            name="address.country"
            value={form.data.address.country}
            onChange={(event) => updateAddress('country', event.target.value.toUpperCase())}
            error={errors['address.country']}
            maxLength={80}
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-gray-100">
        <CardHeader className="min-h-0 bg-white px-8 pt-8">
          <CardTitle>Observações internas</CardTitle>
          <StickyNote className="size-5 text-slate-400" />
        </CardHeader>
        <CardContent className="px-8 pb-8 pt-6">
          <Label htmlFor="notes" className="sr-only">
            Observações internas
          </Label>
          <Textarea
            id="notes"
            name="notes"
            value={form.data.notes}
            onChange={(event) => form.setData('notes', event.target.value)}
            placeholder="Contexto de relacionamento, preferências de contato ou observações relevantes"
            className="min-h-32 resize-y rounded-lg border-gray-300 focus-visible:border-yol-cyan focus-visible:ring-cyan-100"
            maxLength={10_000}
            aria-invalid={!!errors.notes}
          />
          {errors.notes && <p className="mt-2 text-xs text-destructive">{errors.notes}</p>}
        </CardContent>
        <CardFooter className="justify-between gap-3 bg-white px-8 py-5">
          <Button variant="outline" type="button" asChild>
            <Link href={client ? `/clients/${client.id}` : '/clients'}>
              <ArrowLeft className="size-4" />
              Cancelar
            </Link>
          </Button>
          <Button
            type="submit"
            disabled={form.processing}
            className="bg-yol-cyan text-white shadow-none hover:bg-yol-cyan-hover"
          >
            <Save className="size-4" />
            {form.processing ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar cliente'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
