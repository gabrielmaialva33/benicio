import { Head, Link, useForm } from '@inertiajs/react'
import { MainLayout } from '~/layouts'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Field } from '~/components/forms/field'

export default function CreateUserPage() {
  const { data, setData, post, processing, errors } = useForm({
    full_name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    post('/users')
  }

  return (
    <MainLayout>
      <Head title="Novo usuário" />

      <div>
        <form onSubmit={handleSubmit}>
          <Card className="border-gray-100">
            <CardHeader className="px-8 pt-8">
              <div>
                <CardTitle>Dados do usuário</CardTitle>
                <p className="mt-1 text-sm text-gray-500">
                  Preencha os dados de acesso à plataforma.
                </p>
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
              <Field
                label="Senha"
                name="password"
                type="password"
                value={data.password}
                onChange={(event) => setData('password', event.target.value)}
                error={errors.password}
                hint="Use pelo menos 8 caracteres"
                autoComplete="new-password"
                required
              />
              <Field
                label="Confirmar senha"
                name="password_confirmation"
                type="password"
                value={data.password_confirmation}
                onChange={(event) => setData('password_confirmation', event.target.value)}
                error={errors.password_confirmation}
                autoComplete="new-password"
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
                {processing ? 'Salvando...' : 'Cadastrar usuário'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </MainLayout>
  )
}
