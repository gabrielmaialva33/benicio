import { usePage } from '@inertiajs/react'
import { useMemo } from 'react'

import { FALLBACK_PAGE_COPY, MENU_SECTIONS, PAGE_COPY_RULES } from '~/config/menu.config'
import type { MenuItem, MenuSection, PageCopy } from '~/config/types'
import { useAuth } from '~/hooks/use_auth'

/** Strips the query string; every navigation check works on the path alone. */
export function currentPath(url: string) {
  return url.split('?', 1)[0] || '/'
}

/**
 * `/folders` must not light up while the user is on `/foldersomething`, and
 * `/dashboard` must not swallow every nested route, hence the boundary check.
 */
export function isPathActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function filterItems(items: MenuItem[], can: (permission: string) => boolean): MenuItem[] {
  return items
    .filter((item) => !item.permission || can(item.permission))
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => !child.permission || can(child.permission)),
    }))
}

/**
 * The navigation the current user is actually allowed to see, plus the helpers
 * the sidebar, the header and the command palette all need. Deriving them from
 * one config is what keeps the three in sync.
 */
export function useMenu() {
  const { url } = usePage()
  const { can } = useAuth()
  const pathname = currentPath(url)

  const sections: MenuSection[] = useMemo(
    () =>
      MENU_SECTIONS.map((section) => ({
        ...section,
        items: filterItems(section.items, can),
      })).filter((section) => section.items.length > 0),
    [can]
  )

  /** Flat list of reachable destinations — what the command palette searches. */
  const destinations: MenuItem[] = useMemo(
    () =>
      sections.flatMap((section) =>
        section.items.flatMap((item) => [item, ...(item.children ?? [])])
      ),
    [sections]
  )

  const isActive = (href: string) => isPathActive(pathname, href)

  const isItemActive = (item: MenuItem) =>
    isActive(item.href) || (item.children ?? []).some((child) => isActive(child.href))

  return { pathname, sections, destinations, isActive, isItemActive }
}

/**
 * Header title, description and breadcrumb for the current route. Replaces the
 * `if (path.startsWith(...))` ladder the header used to carry.
 */
export function usePageCopy(): PageCopy & { breadcrumb: Array<{ label: string; href?: string }> } {
  const { url } = usePage()
  const pathname = currentPath(url)

  return useMemo(() => {
    const rule = PAGE_COPY_RULES.find((candidate) =>
      typeof candidate.match === 'string'
        ? candidate.match === pathname || pathname.startsWith(`${candidate.match}/`)
        : candidate.match.test(pathname)
    )

    if (!rule) return { ...FALLBACK_PAGE_COPY, breadcrumb: [] }

    return {
      title: rule.title,
      description: rule.description,
      breadcrumb: rule.breadcrumb ?? [],
    }
  }, [pathname])
}
