import { Head, Link, useForm } from '@inertiajs/react'
import { MainLayout } from '~/layouts'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Field } from '~/components/forms/field'
import type { User } from '~/types'

interface EditUserPageProps {
  user: User
}

export default function EditUserPage({ user }: EditUserPageProps) {
  const { data, setData, put, processing, errors } = useForm({
    full_name: user.full_name || '',
    email: user.email || '',
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    put(`/users/${user.id}`)
  }

  return (
    <MainLayout>
      <Head title={`Editar usuário: ${user.full_name}`} />

      <div>
        <form onSubmit={handleSubmit}>
          <Card className="border-gray-100">
            <CardHeader className="px-8 pt-8">
              <div>
                <CardTitle>Dados do usuário</CardTitle>
                <p className="mt-1 text-sm text-gray-500">Atualize os dados cadastrais.</p>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 px-8 py-6 md:grid-cols-2">
              <Field
                label="Nome completo"
                name="full_name"
                value={data.full_name}
                onChange={(event) => setData('full_name', event.target.value)}
                error={errors.full_name}
                autoComplete="name"
                required
              />
              <Field
                label="E-mail"
                name="email"
                type="email"
                value={data.email}
                onChange={(event) => setData('email', event.target.value)}
                error={errors.email}
                autoComplete="email"
                required
              />
            </CardContent>
            <CardFooter className="justify-end gap-3 px-8 py-5">
              <Link href="/users">
                <Button variant="outline" type="button">
                  Cancelar
                </Button>
              </Link>
              <Button variant="primary" type="submit" disabled={processing}>
                {processing ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </MainLayout>
  )
}
