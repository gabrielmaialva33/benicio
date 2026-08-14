import { router } from '@inertiajs/react'
import { FolderOpen, Search } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import type { MenuItem } from '~/config/types'
import { useMenu } from '~/hooks/use_menu'
import { useFavoriteFolders } from '~/hooks/use_shell_data'

function ItemIcon({ item }: { item: MenuItem }) {
  if (item.iconPath) {
    return <img src={item.iconPath} alt="" width={16} height={16} className="size-4 opacity-70" />
  }

  const Icon = item.icon
  return Icon ? <Icon className="size-4" /> : <Search className="size-4" />
}

/** Event the header button dispatches; keeps trigger and dialog decoupled. */
export const COMMAND_PALETTE_EVENT = 'benicio:command-palette'

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_EVENT))
}

/**
 * Keyboard-first navigation (⌘K / Ctrl+K).
 *
 * It reads the same permission-filtered menu the sidebar renders, so it can
 * never offer a destination the user would be bounced from, and it never has
 * to be updated separately when a route is added.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const { sections } = useMenu()
  const favoriteFolders = useFavoriteFolders()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return

      event.preventDefault()
      setOpen((current) => !current)
    }

    const onExternalOpen = () => setOpen(true)

    document.addEventListener('keydown', onKeyDown)
    window.addEventListener(COMMAND_PALETTE_EVENT, onExternalOpen)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener(COMMAND_PALETTE_EVENT, onExternalOpen)
    }
  }, [])

  const go = (href: string) => {
    setOpen(false)
    router.visit(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar páginas e pastas favoritas..." />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>

        {sections.map((section) => (
          <CommandGroup key={section.heading} heading={section.heading}>
            {section.items.map((item) => (
              <CommandItem
                key={item.href}
                /* cmdk matches on `value`, and the href carries the words a
                   user actually types ("clientes", "pastas"). */
                value={`${item.title} ${item.href}`}
                onSelect={() => go(item.href)}
              >
                <ItemIcon item={item} />
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        {(favoriteFolders.data ?? []).length > 0 && (
          <CommandGroup heading="Favoritos">
            {(favoriteFolders.data ?? []).map((folder) => (
              <CommandItem
                key={folder.id}
                value={`${folder.code} ${folder.title}`}
                onSelect={() => go(`/folders/${folder.id}`)}
              >
                <FolderOpen className="size-4" />
                <span className="truncate">
                  {folder.code} — {folder.title}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
