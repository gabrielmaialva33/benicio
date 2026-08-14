import { Head } from '@inertiajs/react'
import { useMemo, useState } from 'react'
import { KeyRound, Search } from 'lucide-react'

import { MainLayout } from '~/layouts'
import {
  Card,
  CardContent,
  CardHeader,
  CardHeading,
  CardTitle,
  CardToolbar,
} from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { actionBadgeVariant } from '~/lib/permission_badges'
import { actionLabel, contextLabel, resourceLabel } from '~/lib/permission_labels'
import { Input } from '~/components/ui/input'

interface PermissionRow {
  id: number
  name: string
  resource: string
  action: string
  context: string
  description: string | null
}

interface PermissionsPageProps {
  permissions: PermissionRow[]
}

function groupByResource(permissions: PermissionRow[]): [string, PermissionRow[]][] {
  const groups = new Map<string, PermissionRow[]>()
  for (const permission of permissions) {
    const bucket = groups.get(permission.resource) ?? []
    bucket.push(permission)
    groups.set(permission.resource, bucket)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
}

export default function PermissionsPage({ permissions }: PermissionsPageProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return permissions
    return permissions.filter((permission) =>
      [permission.name, permission.resource, permission.action, permission.context]
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [permissions, search])

  const grouped = useMemo(() => groupByResource(filtered), [filtered])

  return (
    <MainLayout>
      <Head title="Permissões" />

      <div className="space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute start-4 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Pesquisar permissões..."
            className="w-full ps-11"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {grouped.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma permissão corresponde à pesquisa.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {grouped.map(([resource, items]) => (
              <Card key={resource} className="border-gray-100">
                <CardHeader>
                  <CardHeading>
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-cyan-50 text-yol-cyan">
                        <KeyRound className="size-4" />
                      </div>
                      <CardTitle>{resourceLabel(resource)}</CardTitle>
                    </div>
                  </CardHeading>
                  <CardToolbar>
                    <Badge variant="secondary" appearance="light" size="sm">
                      {items.length}
                    </Badge>
                  </CardToolbar>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-4 py-3 transition hover:border-cyan-200 hover:bg-cyan-50/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium first-letter:uppercase">
                          {actionLabel(permission.action)}
                        </p>
                        {permission.description && (
                          <p className="truncate text-xs text-muted-foreground">
                            {permission.description}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Badge
                          variant={actionBadgeVariant(permission.action)}
                          appearance="light"
                          size="sm"
                        >
                          {actionLabel(permission.action)}
                        </Badge>
                        {permission.context !== 'any' && (
                          <Badge variant="secondary" appearance="outline" size="sm">
                            {contextLabel(permission.context)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
