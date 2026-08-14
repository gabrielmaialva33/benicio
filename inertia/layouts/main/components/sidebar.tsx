import { Link, usePage } from '@inertiajs/react'
import {
  ChevronDown,
  ContactRound,
  FileText,
  type LucideIcon,
  Settings,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { BrandLogo } from '~/components/brand_logo'
import { useAuth } from '~/hooks/use_auth'
import { useFavoriteFolders } from '~/hooks/use_shell_data'
import { cn } from '~/lib/utils'

interface MenuItem {
  title: string
  href: string
  icon?: LucideIcon
  iconPath?: string
  children?: Array<{ title: string; href: string; permission?: string }>
  /** `resource.action` the route requires; without it the item leaves the menu. */
  permission?: string
}

const pageItems: MenuItem[] = [
  {
    title: 'Visão Geral',
    href: '/dashboard',
    iconPath: '/yol/icons/overview.svg',
    permission: 'dashboard.read',
  },
  {
    title: 'Pastas',
    href: '/folders',
    iconPath: '/yol/icons/folders.svg',
    permission: 'folders.list',
    children: [
      { title: 'Cadastrar', href: '/folders/create', permission: 'folders.create' },
      { title: 'Consulta', href: '/folders', permission: 'folders.list' },
    ],
  },
  {
    title: 'Agenda',
    href: '/calendar',
    iconPath: '/yol/icons/calendar.svg',
    permission: 'hearings.list',
  },
  { title: 'Chat IA', href: '/chat', iconPath: '/yol/icons/sparkles.svg', permission: 'ai.read' },
]

const managementItems: MenuItem[] = [
  { title: 'Clientes', href: '/clients', icon: ContactRound, permission: 'clients.list' },
  { title: 'Usuários', href: '/users', icon: Users, permission: 'users.list' },
  { title: 'Arquivos', href: '/files', icon: Upload, permission: 'files.list' },
  { title: 'Papéis', href: '/roles', icon: ShieldCheck, permission: 'roles.list' },
  { title: 'Permissões', href: '/permissions', icon: FileText, permission: 'permissions.list' },
  { title: 'Configurações', href: '/settings', icon: Settings },
]

const favoriteColors = ['#008980', '#2fac68', '#f6c000', '#5a5dff', '#ff5a5d', '#ff8a00']

function currentPath(url: string) {
  return url.split('?', 1)[0] ?? '/'
}

function isActive(url: string, href: string) {
  const path = currentPath(url)
  return path === href || (href !== '/dashboard' && path.startsWith(`${href}/`))
}

function NavigationIcon({ item, active }: { item: MenuItem; active: boolean }) {
  if (item.iconPath) {
    return (
      <img
        src={item.iconPath}
        alt=""
        width={24}
        height={24}
        className={cn('size-6 shrink-0', active && 'brightness-0 invert')}
      />
    )
  }

  const Icon = item.icon
  return Icon ? <Icon className="size-6 shrink-0 text-gray-300" strokeWidth={2} /> : null
}

interface SidebarNavProps {
  collapsed?: boolean
  onNavigate?: () => void
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const { url } = usePage()
  const [search, setSearch] = useState('')
  const [showAllFavorites, setShowAllFavorites] = useState(false)
  const [foldersOpen, setFoldersOpen] = useState(currentPath(url).startsWith('/folders'))
  const favoriteFolders = useFavoriteFolders()
  const { can: can } = useAuth()
  const searchQuery = search.trim().toLocaleLowerCase('pt-BR')

  const filterItems = (items: MenuItem[]) => {
    const allowedItems = items
      .filter((item) => !item.permission || can(item.permission))
      .map((item) => ({
        ...item,
        children: item.children?.filter((child) => !child.permission || can(child.permission)),
      }))

    return searchQuery
      ? allowedItems.filter((item) => item.title.toLocaleLowerCase('pt-BR').includes(searchQuery))
      : allowedItems
  }

  const visiblePages = filterItems(pageItems)
  const visibleManagement = filterItems(managementItems)
  const visibleFavorites = useMemo(() => {
    const favorites = favoriteFolders.data ?? []
    if (!searchQuery) return favorites

    return favorites.filter((folder) =>
      `${folder.code} ${folder.title} ${folder.area}`
        .toLocaleLowerCase('pt-BR')
        .includes(searchQuery)
    )
  }, [favoriteFolders.data, searchQuery])
  const displayedFavorites =
    showAllFavorites || searchQuery ? visibleFavorites : visibleFavorites.slice(0, 3)

  const renderMenuItem = (item: MenuItem) => {
    const hasChildren = Boolean(item.children?.length)
    const active = !hasChildren && isActive(url, item.href)
    const open = hasChildren && (foldersOpen || currentPath(url).startsWith(item.href))
    const content = (
      <>
        <NavigationIcon item={item} active={active} />
        {!collapsed && <span className="truncate">{item.title}</span>}
        {!collapsed && hasChildren && (
          <ChevronDown
            className={cn('ml-auto size-5 transition-transform', open && 'rotate-180')}
          />
        )}
      </>
    )

    return (
      <div key={item.href}>
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setFoldersOpen((value) => !value)}
            className={cn(
              'group flex w-full items-center gap-3 rounded-[10px] px-3 py-[14px] font-semibold text-base text-white transition-colors hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-yol-sidebar',
              collapsed && 'justify-center'
            )}
          >
            {content}
          </button>
        ) : (
          <Link
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.title : undefined}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex w-full items-center gap-3 rounded-[10px] px-3 py-[14px] font-semibold text-base text-white transition-colors hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-yol-sidebar',
              collapsed && 'justify-center',
              active && !collapsed && 'bg-orange-500 hover:bg-orange-500',
              active && collapsed && '[&_img]:brightness-100 [&_img]:invert-0'
            )}
          >
            {content}
          </Link>
        )}

        {/*
          The bottom margin is what keeps an expanded submenu from crowding the
          next top-level entry: without it the highlighted child sits flush
          against the following row and the two read as one control.
        */}
        {open && !collapsed && (
          <ul className="mt-2 mb-3 space-y-2 pl-8">
            {item.children?.map((child) => {
              const childActive = currentPath(url) === child.href
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center rounded-md p-2 font-medium text-sm text-gray-400 transition-colors hover:bg-gray-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-yol-sidebar',
                      childActive && 'bg-orange-500 text-white hover:bg-orange-500'
                    )}
                  >
                    <span className="mr-3 size-1.5 rounded-full bg-white" />
                    {child.title}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  return (
    <nav
      className={cn(
        'yol-scrollbar flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto',
        collapsed ? 'mt-10 items-center px-4' : 'mt-[25px] gap-[25px]'
      )}
    >
      {!collapsed && (
        <label className="relative block px-10 pr-[60px]">
          <span className="sr-only">Filtrar navegação</span>
          <img
            src="/yol/icons/magnifier.svg"
            alt=""
            width={16}
            height={16}
            className="pointer-events-none absolute left-[52px] top-1/2 size-4 -translate-y-1/2"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar"
            className="h-[46px] w-full rounded-md border-0 bg-[#86878b] pl-11 pr-3 text-sm text-white outline-none placeholder:text-white focus:ring-2 focus:ring-orange-500/50"
          />
        </label>
      )}

      {visiblePages.length > 0 && (
        <section
          className={cn(
            'w-full',
            collapsed
              ? 'flex flex-col items-center'
              : 'border-b border-[#babbc1] px-10 pb-[25px] pr-[60px]'
          )}
        >
          {!collapsed && (
            <h2 className="mb-2 mt-4 font-semibold text-sm uppercase text-[#a1a5b7]">Páginas</h2>
          )}
          <div className={cn(collapsed && 'w-full space-y-1')}>
            {visiblePages.map(renderMenuItem)}
          </div>
        </section>
      )}

      {/* Favourites sit between the two menus, and the section stays put when
          the list is empty: a heading that vanishes makes the sidebar look like
          it lost a feature rather than like there is nothing starred yet. */}
      {!collapsed && can('folders.list') && (
        <section className="w-full border-b border-[#babbc1] px-10 pb-[25px] pr-[60px]">
          <h2 className="mb-2 font-semibold text-sm uppercase text-[#a1a5b7]">Favoritos</h2>
          {favoriteFolders.isPending || favoriteFolders.isError ? (
            <p className="text-xs text-white/55">
              {favoriteFolders.isPending ? 'Carregando favoritos...' : 'Não foi possível carregar.'}
            </p>
          ) : visibleFavorites.length === 0 ? (
            <p className="text-xs leading-5 text-white/55">
              {searchQuery
                ? 'Nenhum favorito corresponde à busca.'
                : 'Marque uma pasta com a estrela para vê-la aqui.'}
            </p>
          ) : (
            <div>
              {displayedFavorites.map((folder, index) => (
                <Link
                  key={folder.id}
                  href={`/folders/${folder.id}`}
                  onClick={onNavigate}
                  className="flex min-h-[50px] items-center gap-3 rounded-[10px] px-3 py-2 font-semibold text-base text-white transition-colors hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-yol-sidebar"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: favoriteColors[index % favoriteColors.length] }}
                  />
                  <span className="flex min-w-0 flex-1 truncate">
                    <span>{folder.code}</span>
                    <span aria-hidden="true">&nbsp;-&nbsp;</span>
                    <span className="truncate">{folder.title}</span>
                  </span>
                  <span
                    className="shrink-0 rounded-md bg-white/10 px-1.5 py-0.5 text-xs tabular-nums text-white/70"
                    aria-label={`${folder.processes_count} processos`}
                  >
                    {folder.processes_count}
                  </span>
                </Link>
              ))}
              {!searchQuery && visibleFavorites.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllFavorites((value) => !value)}
                  className="mt-2 flex items-center gap-2 px-3 font-semibold text-sm text-[#a1a5b7] hover:text-white"
                >
                  <img
                    src="/yol/icons/down.svg"
                    alt=""
                    width={16}
                    height={16}
                    className={cn('size-4 transition-transform', showAllFavorites && 'rotate-180')}
                  />
                  {showAllFavorites ? 'Mostrar menos' : 'Mostrar mais'}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {!collapsed && visibleManagement.length > 0 && (
        <section className="w-full border-b border-[#babbc1] px-10 pb-[25px] pr-[60px]">
          <h2 className="mb-2 font-semibold text-sm uppercase text-[#a1a5b7]">Gestão</h2>
          <div>{visibleManagement.map(renderMenuItem)}</div>
        </section>
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
        "sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden bg-yol-sidebar py-10 font-['Work_Sans'] text-white transition-[width] duration-300 ease-in-out lg:flex",
        isCollapsed ? 'w-24' : 'w-[340px]'
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center',
          isCollapsed
            ? 'flex-col justify-center gap-6'
            : 'justify-between gap-[78px] px-10 pr-[17px]'
        )}
      >
        <Link href="/dashboard" aria-label="Ir para a visão geral">
          <BrandLogo collapsed={isCollapsed} inverse />
        </Link>

        <button type="button" onClick={onToggle} aria-label="Alternar barra lateral">
          <img
            src="/yol/icons/left-square.svg"
            alt=""
            width={24}
            height={24}
            className={cn('size-6 transition-transform', isCollapsed && 'rotate-180')}
          />
        </button>
      </div>

      <SidebarNav collapsed={isCollapsed} />
    </aside>
  )
}
