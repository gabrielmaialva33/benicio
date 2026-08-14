import type { LucideIcon } from 'lucide-react'

export interface MenuItem {
  title: string
  /** Destination. Items without one are pure group headers. */
  href: string
  icon?: LucideIcon
  /** Path to an SVG in `public/`, used by the legacy Yol icon set. */
  iconPath?: string
  /** `resource.action` required to see the entry; absent means "always". */
  permission?: string
  children?: MenuItem[]
}

export interface MenuSection {
  /** Heading rendered above the group, e.g. "Páginas". */
  heading: string
  items: MenuItem[]
}

export interface PageCopy {
  title: string
  description?: string
}

export interface PageCopyRule extends PageCopy {
  /**
   * Matches the pathname (no query string). A string means "exact match", a
   * RegExp covers the dynamic routes that never appear in the menu — folder
   * and process detail pages, for instance.
   */
  match: string | RegExp
  /** Trail shown above the title; the current page is appended automatically. */
  breadcrumb?: Array<{ label: string; href?: string }>
}
