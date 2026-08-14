import { Link, usePage } from '@inertiajs/react'
import {
  FileText,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { BrandLogo } from '~/components/brand_logo'
import { cn } from '~/lib/utils'

interface MenuItem {
  title: string
  href: string
  icon: LucideIcon
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

const menuSections: MenuSection[] = [
  {
    title: 'Páginas',
    items: [{ title: 'Visão geral', href: '/dashboard', icon: Home }],
  },
  {
    title: 'Gestão',
    items: [
      { title: 'Usuários', href: '/users', icon: Users },
      { title: 'Arquivos', href: '/files', icon: Upload },
    ],
  },
  {
    title: 'Acesso',
    items: [
      { title: 'Papéis', href: '/roles', icon: ShieldCheck },
      { title: 'Permissões', href: '/permissions', icon: FileText },
      { title: 'Configurações', href: '/settings', icon: Settings },
    ],
  },
]

function currentPath(url: string) {
  return url.split('?', 1)[0] ?? '/'
}

function isActive(url: string, href: string) {
  const path = currentPath(url)
  return path === href || (href !== '/dashboard' && path.startsWith(`${href}/`))
}

interface SidebarNavProps {
  collapsed?: boolean
  onNavigate?: () => void
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const { url } = usePage()
  const [search, setSearch] = useState('')

  const visibleSections = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    if (!query) return menuSections

    return menuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          item.title.toLocaleLowerCase('pt-BR').includes(query)
        ),
      }))
      .filter((section) => section.items.length > 0)
  }, [search])

  return (
    <nav className="yol-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6">
      {!collapsed && (
        <label className="relative mb-6 block">
          <span className="sr-only">Filtrar navegação</span>
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-white/55" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar"
            className="h-11 w-full rounded-xl border border-white/5 bg-white/10 ps-10 pe-3 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-[#f97316]/70 focus:bg-white/[0.14] focus:ring-2 focus:ring-[#f97316]/20"
          />
        </label>
      )}

      <div className="space-y-6">
        {visibleSections.map((section) => (
          <section key={section.title}>
            {!collapsed && (
              <h2 className="mb-2 px-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/35">
                {section.title}
              </h2>
            )}

            <div className="space-y-1.5">
              {section.items.map((item) => {
                const active = isActive(url, item.href)
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.title : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors',
                      collapsed && 'justify-center px-0',
                      active
                        ? 'bg-[#f97316] text-white shadow-[0_8px_24px_rgba(249,115,22,0.22)]'
                        : 'text-white/72 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-5 shrink-0 transition-colors',
                        active ? 'text-white' : 'text-white/55 group-hover:text-white'
                      )}
                      strokeWidth={2}
                    />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {!collapsed && visibleSections.length === 0 && (
        <p className="px-3 py-8 text-center text-sm text-white/45">Nenhuma página encontrada.</p>
      )}
    </nav>
  )
}

interface SidebarProps {
  isCollapsed?: boolean
  onToggle: () => void
}

export function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden bg-[#373737] text-white transition-[width] duration-300 lg:flex',
        isCollapsed ? 'w-[88px]' : 'w-[300px]'
      )}
    >
      <div
        className={cn(
          'flex h-[104px] shrink-0 items-center border-b border-white/10',
          isCollapsed ? 'justify-center px-3' : 'justify-between px-6'
        )}
      >
        <Link href="/dashboard" aria-label="Ir para a visão geral">
          <BrandLogo collapsed={isCollapsed} inverse />
        </Link>

        {!isCollapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Recolher navegação"
            className="flex size-9 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <PanelLeftClose className="size-5" />
          </button>
        )}
      </div>

      {isCollapsed && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expandir navegação"
          className="mx-auto my-5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/65 transition hover:bg-white/15 hover:text-white"
        >
          <PanelLeftOpen className="size-5" />
        </button>
      )}

      <SidebarNav collapsed={isCollapsed} />
    </aside>
  )
}
