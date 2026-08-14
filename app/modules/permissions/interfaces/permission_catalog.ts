/*
|--------------------------------------------------------------------------
| Permission catalogue
|--------------------------------------------------------------------------
|
| The canonical `resource.action` vocabulary, shared by the backend (routes,
| middleware, seeders) and by the Inertia frontend, which reaches it through
| the `#permissions` bundler alias.
|
| This file MUST stay import-free. The moment it pulls in Lucid, a model or
| anything from `#shared`, the browser bundle drags the backend along with it.
| `permission_interface.ts` re-exports these enums as `IPermission.Resources`
| and friends, so backend call sites keep their existing shape.
|
*/

export enum PermissionResources {
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

export enum PermissionActions {
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

export enum PermissionContexts {
  OWN = 'own',
  ANY = 'any',
  TEAM = 'team',
  DEPARTMENT = 'department',
}

/**
 * Builds the `resource.action` string the RBAC layer stores and compares.
 * Prefer this over hand-written literals so a renamed resource breaks the
 * build instead of silently hiding a menu entry.
 */
export function permissionName(resource: PermissionResources, action: PermissionActions): string {
  return `${resource}.${action}`
}
