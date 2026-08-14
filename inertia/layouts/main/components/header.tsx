import { Link, router, usePage } from '@inertiajs/react'
import { Check, ChevronsUpDown, LogOut, Menu, Settings, User } from 'lucide-react'
import { useState } from 'react'

import { BrandLogo } from '~/components/brand_logo'
import { ThemeToggle } from '~/components/theme/theme_toggle'
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
    return {
      title: 'Visão Geral',
      description: 'Suas tarefas principais estão nessa seção.',
    }
  }
  if (path === '/users/create') {
    return { title: 'Novo usuário', description: 'Cadastre uma pessoa na plataforma.' }
  }
  if (path.startsWith('/users/') && path.endsWith('/edit')) {
    return { title: 'Editar usuário', description: 'Atualize os dados e acessos desta pessoa.' }
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

function TenantSwitcher() {
  const { tenants, activeTenant } = useAuth()

  if (tenants.length === 0) return null

  const switchTenant = (tenantId: number) => {
    if (tenantId === activeTenant?.id) return
    router.post('/tenant/switch', { tenant_id: tenantId }, { preserveScroll: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-10 max-w-[220px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <Avatar className="size-6">
            <AvatarFallback className="bg-[#e8f8f3] text-[0.62rem] font-bold text-[#008f72]">
              {activeTenant ? initialsOf(activeTenant.name) : '—'}
            </AvatarFallback>
          </Avatar>
          <span className="hidden truncate text-sm font-semibold sm:block">
            {activeTenant?.name ?? 'Sem escritório'}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Trocar escritório</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onSelect={() => switchTenant(tenant.id)}
            className="gap-2.5"
          >
            <Avatar className="size-7">
              <AvatarFallback className="text-[0.62rem] font-bold">
                {initialsOf(tenant.name)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{tenant.name}</span>
              {tenant.role && (
                <span className="block text-xs capitalize text-muted-foreground">
                  {tenant.role}
                </span>
              )}
            </span>
            {tenant.id === activeTenant?.id && <Check className="size-4 text-[#f97316]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserMenu() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu do usuário"
          className="rounded-xl outline-none ring-[#f97316]/30 transition focus-visible:ring-4"
        >
          <Avatar className="size-10 rounded-xl">
            <AvatarFallback className="rounded-xl bg-[#373737] text-sm font-bold text-white">
              {initialsOf(user.full_name)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2.5">
          <Avatar className="size-9 rounded-lg">
            <AvatarFallback className="rounded-lg bg-[#373737] text-xs font-bold text-white">
              {initialsOf(user.full_name)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{user.full_name}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          </span>
        </DropdownMenuLabel>
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
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => router.post('/logout')}>
          <LogOut className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface HeaderProps {
  onToggleSidebar: () => void
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { url } = usePage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const copy = pageCopy(url)

  return (
    <header className="shrink-0 border-b border-slate-200/80 bg-[#f1f1f2] px-4 py-4 dark:border-white/10 dark:bg-background sm:px-6 lg:min-h-[104px] lg:px-8">
      <div className="mx-auto flex h-full w-full max-w-[1480px] items-center gap-4">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Abrir navegação"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm lg:hidden dark:bg-white/10 dark:text-white"
            >
              <Menu className="size-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex w-[300px] flex-col border-0 bg-[#373737] p-0 text-white"
          >
            <SheetTitle className="sr-only">Navegação principal</SheetTitle>
            <div className="flex h-[104px] shrink-0 items-center border-b border-white/10 px-6">
              <BrandLogo inverse />
            </div>
            <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Alternar navegação"
          className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:text-[#f97316] lg:flex dark:bg-white/10 dark:text-white"
        >
          <Menu className="size-5" />
        </button>

        <Link href="/dashboard" className="mr-auto sm:hidden" aria-label="Ir para a visão geral">
          <BrandLogo collapsed />
        </Link>

        <div className="hidden min-w-0 flex-1 sm:block">
          <h1 className="truncate text-2xl font-bold tracking-[-0.035em] text-[#161c24] dark:text-white">
            {copy.title}
          </h1>
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
            {copy.description}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <TenantSwitcher />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
