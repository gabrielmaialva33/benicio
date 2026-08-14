import { Head } from '@inertiajs/react'
import { KeyRound, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { PermissionMatrix } from '~/components/permissions/permission_matrix'
import { Card, CardContent, CardHeader, CardHeading, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { MainLayout } from '~/layouts'
import { resourceLabel } from '~/lib/permission_labels'

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

export default function PermissionsPage({ permissions }: PermissionsPageProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    if (!term) return permissions

    // Searching the Portuguese labels too, since that is what the page shows.
    return permissions.filter((permission) =>
      [permission.name, permission.resource, permission.action, resourceLabel(permission.resource)]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(term)
    )
  }, [permissions, search])

  const resourceCount = useMemo(
    () => new Set(filtered.map((permission) => permission.resource)).size,
    [filtered]
  )

  return (
    <MainLayout>
      <Head title="Permissões" />

      <Card className="border-gray-100">
        <CardHeader>
          <CardHeading>
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-lg bg-cyan-50 text-yol-cyan">
                <KeyRound className="size-4.5" />
              </div>
              <div>
                <CardTitle>Catálogo de permissões</CardTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {filtered.length} permissões em {resourceCount} recursos
                </p>
              </div>
            </div>
          </CardHeading>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filtrar por recurso ou ação"
              className="ps-10"
            />
          </div>

          <div className="rounded-xl border border-gray-100">
            <PermissionMatrix
              mode="catalogue"
              cells={filtered.map((permission) => ({
                resource: permission.resource,
                action: permission.action,
              }))}
              emptyMessage="Nenhuma permissão corresponde ao filtro."
            />
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  )
}
