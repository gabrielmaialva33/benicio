import type LucidRepositoryInterface from '#shared/lucid/lucid_repository_interface'
import type { PaginateResult } from '#shared/lucid/lucid_repository_interface'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type Permission from '#modules/permissions/models/permission'

namespace IPermission {
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

  export enum Resources {
    USERS = 'users',
    ROLES = 'roles',
    PERMISSIONS = 'permissions',
    FILES = 'files',
    SETTINGS = 'settings',
    REPORTS = 'reports',
    AUDIT = 'audit',
    CLIENTS = 'clients',
    FOLDERS = 'folders',
    PROCESSES = 'processes',
    TASKS = 'tasks',
    HEARINGS = 'hearings',
    DEADLINES = 'deadlines',
    MOVEMENTS = 'movements',
    DOCUMENTS = 'documents',
    DASHBOARD = 'dashboard',
    NOTIFICATIONS = 'notifications',
    MESSAGES = 'messages',
    AI = 'ai',
  }

  export enum Actions {
    CREATE = 'create',
    READ = 'read',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    EXPORT = 'export',
    IMPORT = 'import',
    ASSIGN = 'assign',
    REVOKE = 'revoke',
  }

  export enum Contexts {
    OWN = 'own',
    ANY = 'any',
    TEAM = 'team',
    DEPARTMENT = 'department',
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
