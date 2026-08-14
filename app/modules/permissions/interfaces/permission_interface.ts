import type LucidRepositoryInterface from '#shared/lucid/lucid_repository_interface'
import type { PaginateResult } from '#shared/lucid/lucid_repository_interface'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type Permission from '#modules/permissions/models/permission'
import {
  PermissionActions,
  PermissionContexts,
  PermissionResources,
} from '#modules/permissions/interfaces/permission_catalog'

namespace IPermission {
  /**
   * The vocabulary itself lives in the import-free `permission_catalog`, which
   * the Inertia bundle also consumes. Re-exported here so the 380-odd backend
   * call sites keep using `IPermission.Resources` / `IPermission.Actions`.
   */
  export import Resources = PermissionResources
  export import Actions = PermissionActions
  export import Contexts = PermissionContexts

  export interface Repository extends LucidRepositoryInterface<typeof Permission> {
    findByName(name: string): Promise<Permission | null>

    findByResourceAction(
      resource: string,
      action: string,
      context?: Contexts
    ): Promise<Permission | null>

    syncPermissions(
      permissions: SyncPermissionData[],
      trx?: TransactionClientContract
    ): Promise<void>

    paginateFiltered(
      page: number,
      perPage: number,
      resource?: string,
      action?: string
    ): Promise<PaginateResult<typeof Permission>>

    listOrderedByResource(): Promise<Permission[]>

    findAllIds(trx?: TransactionClientContract): Promise<number[]>

    findAdminPermissionIds(trx?: TransactionClientContract): Promise<number[]>

    findUserPermissionIds(trx?: TransactionClientContract): Promise<number[]>

    findGuestPermissionIds(trx?: TransactionClientContract): Promise<number[]>

    findByRoleSlugs(slugs: string[]): Promise<Permission[]>
  }

  export interface SyncPermissionData {
    name: string
    resource: string
    action: string
    context?: Contexts
    description?: string
  }

  export interface PermissionCheck {
    user_id: number
    permission: string | string[]
    requireAll?: boolean
    context?: string
    resource_id?: number
  }

  export interface PermissionData {
    name?: string
    description?: string
    resource: string
    action: string
    context?: Contexts
  }

  export interface ContextPermissionCheck {
    userId: number
    resource: string
    action: string
    context: string
    resourceId?: number
    ownerId?: number
  }
}

export default IPermission
