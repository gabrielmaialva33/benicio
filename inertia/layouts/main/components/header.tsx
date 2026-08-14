import { Link, router, usePage } from '@inertiajs/react'
import { Check, Menu, Settings, User } from 'lucide-react'
import { useState } from 'react'

import { BrandLogo } from '~/components/brand_logo'
import { HeaderActivity } from '~/components/shell/header_activity'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '~/components/ui/sheet'
import { useAuth } from '~/hooks/use_auth'
import { SidebarNav } from './sidebar'

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function pageCopy(url: string) {
  const path = url.split('?', 1)[0] ?? '/dashboard'

  if (path === '/dashboard') {
    return { title: 'Visão Geral', description: 'Suas tarefas principais estão nessa seção.' }
  }
  if (path === '/folders/create') {
    return { title: 'Cadastro de Pasta', description: 'Preencha os dados da nova pasta.' }
  }
  if (/^\/folders\/\d+\/processes\/create$/.test(path)) {
    return { title: 'Novo Processo', description: 'Cadastre o processo dentro da pasta.' }
  }
  if (/^\/folders\/\d+\/processes\/\d+\/edit$/.test(path)) {
    return { title: 'Editar Processo', description: 'Atualize dados, valores e partes.' }
  }
  if (/^\/folders\/\d+\/processes\/\d+$/.test(path)) {
    return {
      title: 'Detalhes do Processo',
      description: 'Consulte o contexto processual completo.',
    }
  }
  if (/^\/folders\/\d+$/.test(path)) {
    return {
      title: 'Detalhes da Pasta',
      description: 'Acompanhe o contexto jurídico e operacional.',
    }
  }
  if (path.startsWith('/folders')) {
    return { title: 'Consulta de pastas', description: 'Pastas › Consulta' }
  }
  if (path === '/clients/create') {
    return { title: 'Novo Cliente', description: 'Cadastre uma pessoa física ou jurídica.' }
  }
  if (path.startsWith('/clients/') && path.endsWith('/edit')) {
    return { title: 'Editar Cliente', description: 'Atualize os dados cadastrais e de contato.' }
  }
  if (/^\/clients\/\d+$/.test(path)) {
    return { title: 'Detalhes do Cliente', description: 'Consulte dados e vínculos jurídicos.' }
  }
  if (path.startsWith('/clients')) {
    return { title: 'Clientes', description: 'Gerencie a base de clientes do escritório.' }
  }
  if (path.startsWith('/calendar')) {
    return { title: 'Agenda', description: 'Audiências e prazos do escritório.' }
  }
  if (path.startsWith('/notifications')) {
    return { title: 'Notificações', description: 'Tudo que pediu sua atenção.' }
  }
  if (path.startsWith('/chat')) {
    return { title: 'Chat IA', description: 'Seu assistente jurídico inteligente.' }
  }
  if (path.startsWith('/users')) {
    return { title: 'Usuários', description: 'Gerencie as pessoas com acesso à plataforma.' }
  }
  if (path.startsWith('/files')) {
    return { title: 'Arquivos', description: 'Envie e organize os documentos do escritório.' }
  }
  if (path.startsWith('/roles')) {
    return { title: 'Papéis', description: 'Organize os níveis de acesso da equipe.' }
  }
  if (path.startsWith('/permissions')) {
    return { title: 'Permissões', description: 'Consulte as capacidades disponíveis no sistema.' }
  }
  if (path.startsWith('/settings')) {
    return { title: 'Configurações', description: 'Ajuste seu perfil e o escritório ativo.' }
  }

  return { title: 'Benício', description: 'Gestão jurídica em um só lugar.' }
}

function UserMenu() {
  const { user, tenants, activeTenant } = useAuth()

  if (!user) return null

  const switchTenant = (tenantId: number) => {
    if (tenantId === activeTenant?.id) return
    router.post('/tenant/switch', { tenant_id: tenantId }, { preserveScroll: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu do usuário"
          className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
        >
          <Avatar className="size-9 rounded-lg">
            <AvatarFallback className="rounded-lg bg-yol-cyan text-xs font-semibold text-white">
              {initialsOf(user.full_name)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-xl border-[#e1e3ea] p-2">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-semibold text-[#1f2a37]">
            {user.full_name}
          </span>
          <span className="block truncate text-xs font-medium text-gray-500">{user.email}</span>
        </DropdownMenuLabel>

        {tenants.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs uppercase text-gray-400">
              Escritório
            </DropdownMenuLabel>
            {tenants.map((tenant) => (
              <DropdownMenuItem
                key={tenant.id}
                aria-current={tenant.id === activeTenant?.id ? 'true' : undefined}
                onSelect={() => switchTenant(tenant.id)}
              >
                <span className="min-w-0 flex-1 truncate">{tenant.name}</span>
                {tenant.id === activeTenant?.id && <Check className="size-4 text-orange-500" />}
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <User className="size-4" />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="size-4" />
            Configurações
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Header() {
  const { url } = usePage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const copy = pageCopy(url)

  return (
    <header className="shrink-0 bg-yol-page px-4 py-4 font-['Work_Sans'] sm:px-6 lg:px-[30px]">
      <div className="flex min-h-[61px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Abrir navegação"
                className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-gray-600 shadow-sm lg:hidden"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="flex w-[340px] flex-col border-0 bg-yol-sidebar px-0 py-10 text-white"
            >
              <SheetTitle className="sr-only">Navegação principal</SheetTitle>
              <div className="px-10">
                <BrandLogo inverse />
              </div>
              <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="min-w-0">
            <h1 className="truncate font-semibold text-2xl text-yol-ink">{copy.title}</h1>
            {copy.description && (
              <p className="mt-1 hidden truncate text-sm text-gray-500 sm:block">
                {copy.description}
              </p>
            )}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-6">
          <HeaderActivity />
          <UserMenu />
          <button
            type="button"
            onClick={() => router.post('/logout')}
            aria-label="Sair"
            className="flex size-9 items-center justify-center rounded-md transition hover:bg-white/60"
          >
            <img
              src="/yol/icons/exit-right.svg"
              alt=""
              width={22}
              height={22}
              className="size-[22px]"
            />
          </button>
        </div>
      </div>
    </header>
  )
}
