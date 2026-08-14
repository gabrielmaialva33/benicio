import { Link, router } from '@inertiajs/react'
import { Check, Menu, Search, Settings, User } from 'lucide-react'
import { Fragment, useState } from 'react'

import { BrandLogo } from '~/components/brand_logo'
import { openCommandPalette } from '~/components/shared/command_palette'
import { HeaderActivity } from '~/components/shell/header_activity'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Kbd } from '~/components/ui/kbd'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '~/components/ui/sheet'
import { useAuth } from '~/hooks/use_auth'
import { usePageCopy } from '~/hooks/use_menu'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const copy = usePageCopy()

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
            {copy.breadcrumb.length > 0 && (
              <Breadcrumb className="mb-1 hidden sm:block">
                <BreadcrumbList className="text-xs">
                  {copy.breadcrumb.map((crumb) => (
                    /* The separator is an <li> of its own: nesting it inside
                       BreadcrumbItem produced invalid <li> markup and broke
                       hydration. */
                    <Fragment key={crumb.label}>
                      <BreadcrumbItem>
                        {crumb.href ? (
                          <BreadcrumbLink asChild>
                            <Link href={crumb.href}>{crumb.label}</Link>
                          </BreadcrumbLink>
                        ) : (
                          crumb.label
                        )}
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                    </Fragment>
                  ))}
                  <BreadcrumbItem>
                    <BreadcrumbPage>{copy.title}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            )}
            <h1 className="truncate font-semibold text-2xl text-yol-ink">{copy.title}</h1>
            {copy.description && (
              <p className="mt-1 hidden truncate text-sm text-gray-500 sm:block">
                {copy.description}
              </p>
            )}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-6">
          {/*
            The visible word is "Buscar", but the accessible name is not: every
            list screen also has a "Buscar" submit button, and two controls
            sharing a name is ambiguous for screen readers (and for tests).
          */}
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Abrir busca rápida"
            aria-keyshortcuts="Meta+K Control+K"
            className="hidden items-center gap-2 rounded-md bg-white px-3 py-2 text-sm text-gray-500 shadow-sm transition hover:text-gray-700 md:flex"
          >
            <Search className="size-4" />
            Buscar
            <Kbd>⌘K</Kbd>
          </button>

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
