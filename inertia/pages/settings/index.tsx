import { Head, useForm, usePage } from '@inertiajs/react'
import { Building2, UserRound } from 'lucide-react'

import { MainLayout } from '~/layouts'
import { Card, CardContent, CardHeader, CardHeading, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { useAuth } from '~/hooks/use_auth'

interface SettingsProfile {
  id: number
  full_name: string
  email: string
  username: string | null
}

interface SettingsPageProps {
  profile: SettingsProfile
}

interface FlashProps {
  flash?: { success?: string | null; error?: string | null }
}

function ProfileTab({ profile }: { profile: SettingsProfile }) {
  const { flash } = usePage().props as FlashProps
  const { data, setData, post, processing, errors } = useForm({
    full_name: profile.full_name,
    username: profile.username ?? '',
  })

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    post('/settings/profile', { preserveScroll: true })
  }

  return (
    <Card className="border-gray-100">
      <CardHeader>
        <CardHeading>
          <CardTitle>Meu perfil</CardTitle>
          <p className="text-sm text-gray-500">Atualize suas informações pessoais.</p>
        </CardHeading>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="max-w-2xl space-y-6">
          {flash?.success && (
            <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
              {flash.success}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input
              id="full_name"
              value={data.full_name}
              onChange={(event) => setData('full_name', event.target.value)}
              aria-invalid={!!errors.full_name}
            />
            {errors.full_name && <p className="text-sm text-destructive">{errors.full_name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Nome de usuário</Label>
            <Input
              id="username"
              value={data.username}
              onChange={(event) => setData('username', event.target.value)}
              aria-invalid={!!errors.username}
            />
            {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={profile.email} readOnly disabled />
            <p className="text-xs text-gray-500">
              Este e-mail é usado no acesso e não pode ser alterado aqui.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={processing}
              className="bg-[#00b8d9] shadow-none hover:bg-[#00a7c6]"
            >
              {processing ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function WorkspacesTab() {
  const { tenants, activeTenantId } = useAuth()

  return (
    <Card className="border-gray-100">
      <CardHeader>
        <CardHeading>
          <CardTitle>Escritórios</CardTitle>
          <p className="text-sm text-gray-500">
            Escritórios aos quais você pertence e seu papel em cada um.
          </p>
        </CardHeading>
      </CardHeader>
      <CardContent className="p-0">
        {tenants.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">Você ainda não pertence a nenhum escritório.</p>
        ) : (
          <ul className="divide-y divide-border">
            {tenants.map((tenant) => (
              <li key={tenant.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex size-10 items-center justify-center rounded-lg bg-cyan-50 text-[#00b8d9]">
                  <Building2 className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tenant.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{tenant.slug}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {tenant.role && (
                    <Badge variant="secondary" appearance="light" size="sm">
                      {tenant.role}
                    </Badge>
                  )}
                  {tenant.id === activeTenantId && (
                    <Badge variant="primary" appearance="light" size="sm">
                      Ativo
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default function SettingsPage({ profile }: SettingsPageProps) {
  return (
    <MainLayout>
      <Head title="Configurações" />

      <Tabs
        defaultValue="profile"
        className="grid items-start gap-6 lg:grid-cols-[288px_minmax(0,1fr)]"
      >
        <TabsList className="h-auto w-full flex-col items-stretch gap-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_4px_rgba(0,0,0,0.03)]">
          <TabsTrigger
            value="profile"
            className="justify-start gap-3 rounded-lg px-4 py-3 text-gray-500 data-[state=active]:bg-[#00b8d9] data-[state=active]:text-white"
          >
            <UserRound className="size-5" />
            Meu perfil
          </TabsTrigger>
          <TabsTrigger
            value="workspaces"
            className="justify-start gap-3 rounded-lg px-4 py-3 text-gray-500 data-[state=active]:bg-[#00b8d9] data-[state=active]:text-white"
          >
            <Building2 className="size-5" />
            Escritórios
          </TabsTrigger>
        </TabsList>

        <div className="min-w-0">
          <TabsContent value="profile" className="mt-0">
            <ProfileTab profile={profile} />
          </TabsContent>
          <TabsContent value="workspaces" className="mt-0">
            <WorkspacesTab />
          </TabsContent>
        </div>
      </Tabs>
    </MainLayout>
  )
}
