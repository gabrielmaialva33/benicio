import { Link } from '@inertiajs/react'
import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'

import { BrandLogo } from '~/components/brand_logo'
import type { MenuItem, MenuSection } from '~/config/types'
import { useAuth } from '~/hooks/use_auth'
import { useMenu } from '~/hooks/use_menu'
import { useFavoriteFolders } from '~/hooks/use_shell_data'
import { cn } from '~/lib/utils'

const favoriteColors = ['#008980', '#2fac68', '#f6c000', '#5a5dff', '#ff5a5d', '#ff8a00']

const NAV_ITEM_CLASSES =
  'group flex w-full items-center gap-3 rounded-[10px] px-3 py-[14px] font-semibold text-base text-white transition-colors hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-yol-sidebar'

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
  const { pathname, sections, isActive } = useMenu()
  const { can } = useAuth()
  const [search, setSearch] = useState('')
  const [showAllFavorites, setShowAllFavorites] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(
    () =>
      sections.flatMap((s) => s.items).find((item) => item.children?.length && isActive(item.href))
        ?.href ?? null
  )
  const favoriteFolders = useFavoriteFolders()
  const searchQuery = search.trim().toLocaleLowerCase('pt-BR')

  /*
   * The sidebar search narrows the already permission-filtered menu; it never
   * reveals an entry the user cannot reach.
   */
  const visibleSections = useMemo(() => {
    if (!searchQuery) return sections

    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          item.title.toLocaleLowerCase('pt-BR').includes(searchQuery)
        ),
      }))
      .filter((section) => section.items.length > 0)
  }, [sections, searchQuery])

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
    const active = !hasChildren && isActive(item.href)
    const open = hasChildren && (expanded === item.href || isActive(item.href))
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
            aria-expanded={open}
            onClick={() => setExpanded((current) => (current === item.href ? null : item.href))}
            className={cn(NAV_ITEM_CLASSES, collapsed && 'justify-center')}
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
              NAV_ITEM_CLASSES,
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
              const childActive = pathname === child.href
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

  const renderSection = (section: MenuSection, index: number) => (
    <section
      key={section.heading}
      className={cn(
        'w-full',
        collapsed
          ? 'flex flex-col items-center'
          : 'border-b border-[#babbc1] px-10 pb-[25px] pr-[60px]'
      )}
    >
      {!collapsed && (
        <h2
          className={cn(
            'mb-2 font-semibold text-sm uppercase text-[#a1a5b7]',
            index === 0 && 'mt-4'
          )}
        >
          {section.heading}
        </h2>
      )}
      <div className={cn(collapsed && 'w-full space-y-1')}>{section.items.map(renderMenuItem)}</div>
    </section>
  )

  /*
   * Favourites are a permission-gated group like any other, and the section
   * stays put when the list is empty: a heading that vanishes makes the
   * sidebar look like it lost a feature rather than like nothing is starred.
   */
  const favoritesSection =
    !collapsed && can('folders.list') ? (
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
    ) : null

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

      {visibleSections.slice(0, 1).map(renderSection)}

      {/*
        Rendered outside the section loop on purpose: a search term that
        matches no menu entry still has to keep the favourites list on screen.
      */}
      {favoritesSection}

      {visibleSections.slice(1).map(renderSection)}
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
