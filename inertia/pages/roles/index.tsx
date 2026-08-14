import { Head } from '@inertiajs/react'
import { ChevronDown, ShieldCheck, Users } from 'lucide-react'
import { useMemo, useState } from 'react'

import { PermissionMatrix } from '~/components/permissions/permission_matrix'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent } from '~/components/ui/card'
import { MainLayout } from '~/layouts'
import { cn } from '~/lib/utils'

interface RolePermission {
  id: number
  name: string
  resource: string
  action: string
  context: string
}

interface RoleRow {
  id: number
  name: string
  slug: string
  description: string | null
  users_count: number
  permissions: RolePermission[]
}

interface RolesPageProps {
  roles: RoleRow[]
}

const SLUG_BADGE: Record<string, 'primary' | 'destructive' | 'info' | 'success' | 'secondary'> = {
  root: 'destructive',
  admin: 'primary',
  editor: 'info',
  user: 'success',
  guest: 'secondary',
}

function RoleRowItem({
  role,
  catalogue,
  expanded,
  onToggle,
}: {
  role: RoleRow
  catalogue: Array<{ resource: string; action: string }>
  expanded: boolean
  onToggle: () => void
}) {
  const granted = useMemo(
    () =>
      new Set(role.permissions.map((permission) => `${permission.resource}.${permission.action}`)),
    [role.permissions]
  )

  /**
   * The matrix is drawn over the whole catalogue rather than over what the role
   * happens to have, so a missing capability shows as an explicit gap instead
   * of simply not being there — that absence is what an administrator audits.
   */
  const cells = useMemo(
    () =>
      catalogue.map((entry) => ({
        ...entry,
        granted: granted.has(`${entry.resource}.${entry.action}`),
      })),
    [catalogue, granted]
  )

  const coverage = catalogue.length > 0 ? Math.round((granted.size / catalogue.length) * 100) : 0

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="flex flex-wrap items-center gap-4 px-4 py-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={`role-${role.id}-matrix`}
            className="flex items-center gap-2.5 text-left transition hover:text-yol-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yol-cyan/40"
          >
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'size-4 shrink-0 text-gray-400 transition-transform',
                !expanded && '-rotate-90'
              )}
            />
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-yol-cyan">
              <ShieldCheck className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <strong className="truncate font-semibold text-yol-ink">{role.name}</strong>
                <Badge variant={SLUG_BADGE[role.slug] ?? 'secondary'} appearance="light" size="sm">
                  {role.slug}
                </Badge>
              </span>
              {role.description && (
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {role.description}
                </span>
              )}
            </span>
          </button>
        </div>
        <div className="w-20 shrink-0 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" aria-hidden="true" />
            {role.users_count}
          </span>
        </div>
        {/* Fixed width, matching the header: an auto-width column here let the
            digit count of the permission total shift every column before it. */}
        <div className="w-[8.5rem] shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100"
              role="img"
              aria-label={`${coverage}% do catálogo`}
            >
              <div className="h-full rounded-full bg-yol-cyan" style={{ width: `${coverage}%` }} />
            </div>
            <span className="text-sm tabular-nums text-muted-foreground">
              {role.permissions.length}
            </span>
          </div>
        </div>
      </div>
      {expanded && (
        <div id={`role-${role.id}-matrix`} className="bg-gray-50/60 p-4">
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <PermissionMatrix
              mode="grants"
              cells={cells}
              emptyMessage="Nenhuma permissão atribuída."
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function RolesPage({ roles }: RolesPageProps) {
  const [expandedRole, setExpandedRole] = useState<number | null>(null)

  /**
   * A role's grants only mean something against everything that exists, and the
   * union across roles is the closest thing this page has to the catalogue.
   */
  const catalogue = useMemo(() => {
    const seen = new Map<string, { resource: string; action: string }>()
    for (const role of roles) {
      for (const permission of role.permissions) {
        seen.set(`${permission.resource}.${permission.action}`, {
          resource: permission.resource,
          action: permission.action,
        })
      }
    }
    return Array.from(seen.values())
  }, [roles])

  return (
    <MainLayout>
      <Head title="Papéis" />

      <Card className="border-gray-100">
        <CardContent className="p-0">
          {roles.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum papel encontrado.
            </p>
          ) : (
            <div>
              <div className="flex items-center gap-4 border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <div className="min-w-0 flex-1">Papel</div>
                <div className="w-20 shrink-0">Usuários</div>
                <div className="w-[8.5rem] shrink-0">Permissões</div>
              </div>
              <div>
                {roles.map((role) => (
                  <RoleRowItem
                    key={role.id}
                    role={role}
                    catalogue={catalogue}
                    expanded={expandedRole === role.id}
                    onToggle={() =>
                      setExpandedRole((current) => (current === role.id ? null : role.id))
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  )
}
