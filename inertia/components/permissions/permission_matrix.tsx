import { Check, Minus } from 'lucide-react'
import { useMemo } from 'react'

import { actionLabel, resourceLabel } from '~/lib/permission_labels'

/**
 * A resource × action grid, the shape every RBAC console converges on.
 *
 * Both screens used to render one card per group, which turned a hundred
 * grants into a wall you had to scroll rather than read. A matrix answers the
 * question people actually bring to these pages — "can this role delete
 * folders?" — by looking at one intersection.
 */
export interface MatrixCell {
  resource: string
  action: string
  /** Present in the catalogue but not granted; only meaningful in role view. */
  granted?: boolean
}

interface PermissionMatrixProps {
  cells: MatrixCell[]
  /** Role view marks granted/denied; the catalogue only marks existence. */
  mode: 'catalogue' | 'grants'
  emptyMessage?: string
}

/**
 * Core CRUD reads left to right in the order people think about it; anything
 * domain-specific (sign, reschedule, status_change) trails behind it
 * alphabetically so the common columns stay in the same place per screen.
 */
const ACTION_ORDER = ['read', 'view', 'list', 'create', 'update', 'delete', 'export', 'import']

function sortActions(actions: string[]): string[] {
  return [...actions].sort((a, b) => {
    const indexA = ACTION_ORDER.indexOf(a)
    const indexB = ACTION_ORDER.indexOf(b)
    if (indexA !== -1 && indexB !== -1) return indexA - indexB
    if (indexA !== -1) return -1
    if (indexB !== -1) return 1
    return a.localeCompare(b, 'pt-BR')
  })
}

export function PermissionMatrix({ cells, mode, emptyMessage }: PermissionMatrixProps) {
  const { resources, actions, lookup } = useMemo(() => {
    const resourceSet = new Set<string>()
    const actionSet = new Set<string>()
    const map = new Map<string, boolean>()

    for (const cell of cells) {
      resourceSet.add(cell.resource)
      actionSet.add(cell.action)
      map.set(`${cell.resource}.${cell.action}`, cell.granted ?? true)
    }

    return {
      // Only columns that exist somewhere in the data get rendered: a fixed
      // column set would leave most of the grid permanently blank.
      resources: Array.from(resourceSet).sort((a, b) =>
        resourceLabel(a).localeCompare(resourceLabel(b), 'pt-BR')
      ),
      actions: sortActions(Array.from(actionSet)),
      lookup: map,
    }
  }, [cells])

  if (resources.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage ?? 'Nenhuma permissão encontrada.'}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 border-b border-gray-200 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Recurso
            </th>
            {actions.map((action) => (
              <th
                key={action}
                scope="col"
                className="border-b border-gray-200 bg-white px-3 py-3 text-center text-xs font-semibold text-gray-500"
              >
                {actionLabel(action)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => (
            <tr key={resource} className="group">
              <th
                scope="row"
                className="sticky left-0 z-10 border-b border-gray-100 bg-white px-4 py-2.5 text-left font-medium text-yol-ink group-hover:bg-cyan-50/40"
              >
                {resourceLabel(resource)}
              </th>
              {actions.map((action) => {
                const value = lookup.get(`${resource}.${action}`)
                const exists = value !== undefined
                const granted = value === true

                return (
                  <td
                    key={action}
                    className="border-b border-gray-100 px-3 py-2.5 text-center group-hover:bg-cyan-50/40"
                  >
                    {!exists ? (
                      // An empty cell means the capability does not exist at
                      // all, which is different from existing and being denied.
                      <span className="sr-only">não se aplica</span>
                    ) : granted ? (
                      <span className="inline-flex size-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                        <Check className="size-3.5" aria-hidden="true" />
                        <span className="sr-only">
                          {mode === 'grants' ? 'concedida' : 'disponível'}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex size-6 items-center justify-center rounded-md bg-gray-50 text-gray-300">
                        <Minus className="size-3.5" aria-hidden="true" />
                        <span className="sr-only">não concedida</span>
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
