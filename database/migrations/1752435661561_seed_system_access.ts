import { BaseSchema } from '@adonisjs/lucid/schema'

const SYSTEM_ROLES = [
  { name: 'Root', slug: 'root' },
  { name: 'Admin', slug: 'admin' },
  { name: 'User', slug: 'user' },
  { name: 'Guest', slug: 'guest' },
  { name: 'Editor', slug: 'editor' },
] as const

const RESOURCE_ACTIONS = {
  users: ['create', 'read', 'update', 'delete', 'list', 'export'],
  roles: ['create', 'read', 'update', 'delete', 'list', 'assign', 'revoke'],
  permissions: ['create', 'read', 'update', 'delete', 'list', 'assign', 'revoke'],
  files: ['create', 'read', 'delete', 'list'],
  settings: ['read', 'update'],
  reports: ['read', 'create', 'export'],
  audit: ['read', 'list', 'export'],
  clients: ['create', 'read', 'update', 'delete', 'list'],
  folders: ['create', 'read', 'update', 'delete', 'list'],
  processes: ['create', 'read', 'update', 'delete', 'list'],
  tasks: ['create', 'read', 'update', 'delete', 'list'],
  hearings: ['create', 'read', 'update', 'delete', 'list'],
  deadlines: ['create', 'read', 'update', 'delete', 'list'],
  movements: ['create', 'read', 'update', 'delete', 'list'],
  documents: ['create', 'read', 'update', 'delete', 'list'],
  dashboard: ['read'],
  notifications: ['create', 'read', 'update', 'delete', 'list'],
  messages: ['create', 'read', 'update', 'delete', 'list'],
  ai: ['create', 'read', 'delete', 'list'],
} as const

const USER_LEGAL_RESOURCES = new Set([
  'clients',
  'folders',
  'processes',
  'tasks',
  'hearings',
  'deadlines',
  'movements',
  'documents',
  'messages',
  'ai',
])

const GUEST_BLOCKED_RESOURCES = new Set([
  'permissions',
  'audit',
  'users',
  'roles',
  'files',
  'clients',
  'folders',
  'processes',
  'tasks',
  'hearings',
  'deadlines',
  'movements',
  'documents',
  'dashboard',
  'notifications',
  'messages',
  'ai',
])

const SYSTEM_PERMISSIONS = Object.entries(RESOURCE_ACTIONS).flatMap(([resource, actions]) =>
  actions.map((action) => ({
    name: `${resource}.${action}`,
    description: `${action.charAt(0).toUpperCase()}${action.slice(1)} ${resource}`,
    resource,
    action,
    context: 'any',
  }))
)

function roleReceivesPermission(slug: string, resource: string, action: string): boolean {
  if (slug === 'root') return true
  if (slug === 'admin') {
    return resource !== 'permissions' || ['read', 'list'].includes(action)
  }
  if (slug === 'user') {
    if (resource === 'users') return ['read', 'update'].includes(action)
    if (resource === 'files') return ['create', 'read', 'list'].includes(action)
    if (['ai', 'messages', 'notifications'].includes(resource) && action === 'delete') return true
    if (USER_LEGAL_RESOURCES.has(resource)) {
      return ['create', 'read', 'update', 'list'].includes(action)
    }
    if (['dashboard', 'notifications'].includes(resource)) {
      return ['read', 'update', 'list'].includes(action)
    }
    return false
  }
  if (slug === 'guest') {
    return ['read', 'list'].includes(action) && !GUEST_BLOCKED_RESOURCES.has(resource)
  }
  return false
}

export default class extends BaseSchema {
  async up() {
    await this.db.transaction(async (trx) => {
      await trx.table('roles').insert(SYSTEM_ROLES).onConflict('slug').ignore()
      await trx
        .table('permissions')
        .insert(SYSTEM_PERMISSIONS)
        .onConflict(['resource', 'action', 'context'])
        .ignore()

      const roles = await trx
        .from('roles')
        .whereIn(
          'slug',
          SYSTEM_ROLES.map((role) => role.slug)
        )
        .select('id', 'slug')
      const permissions = await trx
        .from('permissions')
        .whereIn(
          'name',
          SYSTEM_PERMISSIONS.map((permission) => permission.name)
        )
        .select('id', 'resource', 'action')

      const assignments = roles.flatMap((role) =>
        permissions
          .filter((permission) =>
            roleReceivesPermission(role.slug, permission.resource, permission.action)
          )
          .map((permission) => ({ role_id: role.id, permission_id: permission.id }))
      )
      if (assignments.length) {
        await trx
          .table('role_permissions')
          .insert(assignments)
          .onConflict(['role_id', 'permission_id'])
          .ignore()
      }
    })
  }

  async down() {
    await this.db.transaction(async (trx) => {
      await trx
        .from('permissions')
        .whereIn(
          'name',
          SYSTEM_PERMISSIONS.map((permission) => permission.name)
        )
        .delete()
      await trx
        .from('roles')
        .whereIn(
          'slug',
          SYSTEM_ROLES.map((role) => role.slug)
        )
        .delete()
    })
  }
}
