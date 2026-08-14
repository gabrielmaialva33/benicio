import { Head, Link, router } from '@inertiajs/react'
import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
  useTable,
} from '@tanstack/react-table'
import { Edit, MoreVertical, Plus, Search, Trash2 } from 'lucide-react'

import { MainLayout } from '~/layouts'
import {
  Card,
  CardContent,
  CardHeader,
  CardHeading,
  CardTitle,
  CardToolbar,
} from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Badge } from '~/components/ui/badge'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { DataGrid, DataGridContainer } from '~/components/ui/data-grid'
import { dataGridFeatures, type DataGridFeatures } from '~/components/ui/data-grid-features'
import { DataGridTable } from '~/components/ui/data-grid-table'
import { DataGridPagination } from '~/components/ui/data-grid-pagination'
import { DataGridColumnHeader } from '~/components/ui/data-grid-column-header'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { APP_TIME_ZONE } from '~/lib/date'
import type { PaginatedResponse } from '~/types'

interface UserRole {
  id: number
  name: string
  display_name?: string
}

interface UserRow {
  id: number
  full_name: string
  email: string
  username: string | null
  email_verified_at: string | null
  created_at: string
  roles?: UserRole[]
}

interface UsersPageProps {
  users: PaginatedResponse<UserRow>
  search: string
  sortBy: string
  direction: 'asc' | 'desc'
}

const columnHelper = createColumnHelper<DataGridFeatures, UserRow>()

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: APP_TIME_ZONE,
  })
}

export default function UsersPage({ users, search, sortBy, direction }: UsersPageProps) {
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null)
  const [searchValue, setSearchValue] = useState(search)

  const currentPage = Number(users.meta.current_page)
  const perPage = Number(users.meta.per_page)
  const total = Number(users.meta.total)

  const navigate = (params: {
    page?: number
    perPage?: number
    sortBy?: string
    direction?: string
    search?: string
  }) => {
    router.get(
      '/users',
      {
        page: params.page ?? currentPage,
        per_page: params.perPage ?? perPage,
        sort_by: params.sortBy ?? sortBy,
        order: params.direction ?? direction,
        search: params.search ?? searchValue,
      },
      { preserveState: true, preserveScroll: true, replace: true }
    )
  }

  const sorting: SortingState = [{ id: sortBy, desc: direction === 'desc' }]
  const pagination: PaginationState = { pageIndex: currentPage - 1, pageSize: perPage }

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater
    const first = next[0]
    if (first) {
      navigate({ sortBy: first.id, direction: first.desc ? 'desc' : 'asc', page: 1 })
    }
  }

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === 'function' ? updater(pagination) : updater
    navigate({ page: next.pageIndex + 1, perPage: next.pageSize })
  }

  const columns = useMemo(
    () =>
      // `columns()` keeps each column's TValue intact across the array — v9
      // otherwise widens them to `unknown` and the defs stop matching.
      columnHelper.columns([
        columnHelper.accessor('full_name', {
          id: 'full_name',
          header: ({ column }) => <DataGridColumnHeader column={column} title="Nome" />,
          cell: ({ row }) => (
            <div className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarFallback className="bg-cyan-50 text-xs text-cyan-700">
                  {initialsOf(row.original.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.original.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
              </div>
            </div>
          ),
          enableSorting: true,
        }),
        columnHelper.accessor('roles', {
          id: 'roles',
          header: 'Papéis',
          cell: ({ row }) => {
            const roles = row.original.roles ?? []
            if (roles.length === 0) {
              return <span className="text-xs text-muted-foreground">—</span>
            }
            return (
              <div className="flex flex-wrap gap-1">
                {roles.map((role) => (
                  <Badge key={role.id} variant="secondary" appearance="light" size="sm">
                    {role.display_name ?? role.name}
                  </Badge>
                ))}
              </div>
            )
          },
          enableSorting: false,
        }),
        columnHelper.accessor('email_verified_at', {
          id: 'email_verified_at',
          header: 'Status',
          cell: ({ row }) =>
            row.original.email_verified_at ? (
              <Badge variant="success" appearance="light" size="sm">
                Verificado
              </Badge>
            ) : (
              <Badge variant="warning" appearance="light" size="sm">
                Não verificado
              </Badge>
            ),
          enableSorting: false,
        }),
        columnHelper.accessor('created_at', {
          id: 'created_at',
          header: ({ column }) => <DataGridColumnHeader column={column} title="Cadastro" />,
          cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">
              {formatDate(row.original.created_at)}
            </span>
          ),
          enableSorting: true,
        }),
        columnHelper.display({
          id: 'actions',
          header: '',
          cell: ({ row }) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" mode="icon" size="sm">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/users/${row.original.id}/edit`}>
                    <Edit className="size-4" />
                    Editar usuário
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setUserToDelete(row.original)}
                >
                  <Trash2 className="size-4" />
                  Excluir usuário
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ),
        }),
      ]),
    []
  )

  const table = useTable({
    features: dataGridFeatures,
    data: users.data,
    columns,
    state: { sorting, pagination },
    onSortingChange: handleSortingChange,
    onPaginationChange: handlePaginationChange,
    manualSorting: true,
    manualPagination: true,
    rowCount: total,
    getRowId: (row) => String(row.id),
  })

  const confirmDelete = () => {
    if (!userToDelete) return
    router.delete(`/users/${userToDelete.id}`, {
      preserveScroll: true,
      onFinish: () => setUserToDelete(null),
    })
  }

  return (
    <MainLayout>
      <Head title="Usuários" />

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso exclui <strong>{userToDelete?.full_name}</strong> permanentemente. A ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <div className="flex justify-end">
          <Button
            asChild
            variant="primary"
            className="bg-yol-cyan shadow-none hover:bg-yol-cyan-hover"
          >
            <Link href="/users/create">
              <Plus className="size-4" />
              Novo usuário
            </Link>
          </Button>
        </div>

        <Card className="border-gray-100">
          <CardHeader>
            <CardHeading>
              <CardTitle>Usuários cadastrados</CardTitle>
            </CardHeading>
            <CardToolbar>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  navigate({ search: searchValue, page: 1 })
                }}
                className="relative"
              >
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Pesquisar usuários..."
                  className="w-full ps-10 sm:w-72"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                />
              </form>
            </CardToolbar>
          </CardHeader>
          <CardContent className="p-0">
            <DataGrid
              table={table}
              recordCount={total}
              tableLayout={{ rowBorder: true, headerBackground: true }}
              emptyMessage="Nenhum usuário encontrado."
            >
              <DataGridContainer border={false}>
                <DataGridTable />
              </DataGridContainer>
              <div className="border-t p-4">
                <DataGridPagination />
              </div>
            </DataGrid>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
