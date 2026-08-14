import { router } from '@inertiajs/react'
import { Trash2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'

interface DeleteDialogProps {
  /** Endpoint that receives the `DELETE`. */
  url: string
  title: string
  description: string
  /** Label of the confirming button, e.g. "Excluir cliente". */
  confirmLabel?: string
  /** Custom trigger; defaults to a destructive icon button. */
  trigger?: ReactNode
  triggerLabel?: string
  onSuccess?: () => void
  /**
   * Controlled mode. Needed whenever the affordance lives inside a menu or a
   * popover: Radix unmounts the dialog with its parent, so the trigger has to
   * stay outside and the caller owns the open state.
   */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Destructive confirmation used by every "delete this record" affordance.
 *
 * The dialog closes only after the request settles (`onFinish`): closing on
 * click made a failed delete look like it had worked.
 */
export function DeleteDialog({
  url,
  title,
  description,
  confirmLabel = 'Excluir',
  trigger,
  triggerLabel = 'Excluir',
  onSuccess,
  open: controlledOpen,
  onOpenChange,
}: DeleteDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const confirm = () => {
    setDeleting(true)
    router.delete(url, {
      preserveScroll: true,
      onSuccess,
      onFinish: () => {
        setDeleting(false)
        setOpen(false)
      },
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <AlertDialogTrigger asChild>
          {trigger ?? (
            <Button
              variant="destructive"
              mode="icon"
              aria-label={triggerLabel}
              className="size-10 shrink-0"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirm} disabled={deleting}>
            {deleting ? 'Excluindo...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
