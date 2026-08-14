import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'

import User from '#modules/users/models/user'
import Role from '#modules/roles/models/role'
import Permission from '#modules/permissions/models/permission'
import File from '#modules/files/models/file'
import PermissionService from '#modules/permissions/services/permission_service'

import IRole from '#modules/roles/interfaces/role_interface'
import IPermission from '#modules/permissions/interfaces/permission_interface'

test.group('Permissions', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('keeps ownership-safe operational permissions aligned for regular users', async ({
    assert,
  }) => {
    const userRole = await Role.findByOrFail('slug', IRole.Slugs.USER)
    const permissions = await userRole.related('permissions').query()
    const permissionNames = permissions.map((permission) => permission.name)

    assert.includeMembers(permissionNames, [
      'notifications.read',
      'notifications.update',
      'notifications.delete',
      'notifications.list',
      'messages.create',
      'messages.delete',
      'ai.create',
      'ai.delete',
    ])
    assert.notInclude(permissionNames, 'notifications.create')
  })

  test('enforces own-context permissions through the ownership repository', async ({ assert }) => {
    const role = await Role.firstOrCreate(
      { slug: IRole.Slugs.EDITOR },
      { name: 'Editor', slug: IRole.Slugs.EDITOR, description: 'Contextual access role' }
    )
    const ownPermission = await Permission.firstOrCreate(
      { name: 'files.read.own' },
      {
        name: 'files.read.own',
        resource: IPermission.Resources.FILES,
        action: IPermission.Actions.READ,
        context: IPermission.Contexts.OWN,
      }
    )
    const teamPermission = await Permission.firstOrCreate(
      { name: 'files.read.team' },
      {
        name: 'files.read.team',
        resource: IPermission.Resources.FILES,
        action: IPermission.Actions.READ,
        context: IPermission.Contexts.TEAM,
      }
    )
    await role.related('permissions').sync([ownPermission.id, teamPermission.id])

    const owner = await User.create({
      full_name: 'File Owner',
      email: 'file-owner@example.com',
      password: 'password123',
    })
    const otherUser = await User.create({
      full_name: 'Other User',
      email: 'other-user@example.com',
      password: 'password123',
    })
    await owner.related('roles').sync([role.id])

    const ownedFile = await File.create({
      owner_id: owner.id,
      tenant_id: null,
      client_name: 'owned.txt',
      file_name: 'owned-file.txt',
      file_size: 1,
      file_type: 'text/plain',
      file_category: 'file',
      url: '/files/owned-file.txt',
    })
    const foreignFile = await File.create({
      owner_id: otherUser.id,
      tenant_id: null,
      client_name: 'foreign.txt',
      file_name: 'foreign-file.txt',
      file_size: 1,
      file_type: 'text/plain',
      file_category: 'file',
      url: '/files/foreign-file.txt',
    })

    const redis = await import('@adonisjs/redis/services/main')
    await redis.default.flushdb()
    const service = await app.container.make(PermissionService)

    assert.isTrue(
      await service.checkUserPermission({
        user_id: owner.id,
        permission: 'files.read.own',
        resource_id: ownedFile.id,
      })
    )
    assert.isFalse(
      await service.checkUserPermission({
        user_id: owner.id,
        permission: 'files.read.own',
        resource_id: foreignFile.id,
      })
    )
    assert.isFalse(
      await service.checkUserPermission({
        user_id: owner.id,
        permission: 'files.read.team',
        resource_id: foreignFile.id,
      })
    )
  })

  test('should create a permission', async ({ client, assert }) => {
    // Create ROOT role and user
    const rootRole = await Role.firstOrCreate(
      { slug: IRole.Slugs.ROOT },
      {
        name: 'Root',
        slug: IRole.Slugs.ROOT,
        description: 'Root administrator',
      }
    )

    const rootUser = await User.create({
      full_name: 'Root Admin',
      email: 'root@example.com',
      password: 'password123',
    })

    await rootUser.related('roles').attach([rootRole.id])

    // Create permissions.create permission
    const permission = await Permission.firstOrCreate(
      {
        resource: IPermission.Resources.PERMISSIONS,
        action: IPermission.Actions.CREATE,
      },
      {
        name: 'permissions.create',
        resource: IPermission.Resources.PERMISSIONS,
        action: IPermission.Actions.CREATE,
        description: 'Create permissions',
      }
    )

    await rootRole.related('permissions').sync([permission.id])

    // Login as root
    const loginResponse = await client.post('/api/v1/sessions/sign-in').json({
      uid: 'root@example.com',
      password: 'password123',
    })

    const token = loginResponse.body().auth.access_token

    // Create new permission
    const response = await client.post('/api/v1/admin/permissions').bearerToken(token).json({
      resource: IPermission.Resources.USERS,
      action: IPermission.Actions.EXPORT,
      context: IPermission.Contexts.OWN,
      description: 'Export users',
    })

    response.assertStatus(201)
    response.assertBodyContains({
      name: 'users.export.own',
      resource: 'users',
      action: 'export',
      context: 'own',
      description: 'Export users',
    })

    const createdPermission = await Permission.findBy('name', 'users.export.own')
    assert.isNotNull(createdPermission)
  })

  test('should list permissions with pagination', async ({ client, assert }) => {
    // Create admin user with permissions.list permission
    const adminRole = await Role.firstOrCreate(
      { slug: IRole.Slugs.ADMIN },
      {
        name: 'Admin',
        slug: IRole.Slugs.ADMIN,
        description: 'Administrator',
      }
    )

    const adminUser = await User.create({
      full_name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
    })

    await adminUser.related('roles').attach([adminRole.id])

    // Create permissions
    const listPermission = await Permission.firstOrCreate(
      {
        resource: IPermission.Resources.PERMISSIONS,
        action: IPermission.Actions.LIST,
      },
      {
        name: 'permissions.list',
        resource: IPermission.Resources.PERMISSIONS,
        action: IPermission.Actions.LIST,
      }
    )

    await adminRole.related('permissions').sync([listPermission.id])

    // Create some test permissions
    for (let i = 0; i < 5; i++) {
      await Permission.firstOrCreate(
        {
          name: `test.permission.${i}`,
        },
        {
          name: `test.permission.${i}`,
          resource: 'test',
          action: `action${i}`,
        }
      )
    }

    // Login
    const loginResponse = await client.post('/api/v1/sessions/sign-in').json({
      uid: 'admin@example.com',
      password: 'password123',
    })

    const token = loginResponse.body().auth.access_token

    // List permissions
    const response = await client
      .get('/api/v1/admin/permissions')
      .bearerToken(token)
      .qs({ page: 1, perPage: 3 })

    response.assertStatus(200)
    assert.equal(response.body().meta.per_page, 3)
    assert.isArray(response.body().data)
  })

  test('should sync role permissions', async ({ client, assert }) => {
    // Create root user
    const rootRole = await Role.firstOrCreate(
      { slug: IRole.Slugs.ROOT },
      {
        name: 'Root',
        slug: IRole.Slugs.ROOT,
        description: 'Root administrator',
      }
    )

    const rootUser = await User.create({
      full_name: 'Root User',
      email: 'root2@example.com',
      password: 'password123',
    })

    await rootUser.related('roles').attach([rootRole.id])

    // Create permissions
    const updatePermission = await Permission.firstOrCreate(
      {
        resource: IPermission.Resources.PERMISSIONS,
        action: IPermission.Actions.UPDATE,
      },
      {
        name: 'permissions.update',
        resource: IPermission.Resources.PERMISSIONS,
        action: IPermission.Actions.UPDATE,
      }
    )

    await rootRole.related('permissions').sync([updatePermission.id])

    // Create test role and permissions
    const testRole = await Role.firstOrCreate(
      { slug: IRole.Slugs.EDITOR },
      {
        name: 'Editor',
        slug: IRole.Slugs.EDITOR,
        description: 'Test editor role',
      }
    )

    const perm1 = await Permission.firstOrCreate(
      {
        name: 'test.perm1',
      },
      {
        name: 'test.perm1',
        resource: 'test',
        action: 'perm1',
      }
    )

    const perm2 = await Permission.firstOrCreate(
      {
        name: 'test.perm2',
      },
      {
        name: 'test.perm2',
        resource: 'test',
        action: 'perm2',
      }
    )

    // Login
    const loginResponse = await client.post('/api/v1/sessions/sign-in').json({
      uid: 'root2@example.com',
      password: 'password123',
    })

    const token = loginResponse.body().auth.access_token

    // Sync permissions
    const response = await client
      .put('/api/v1/admin/roles/permissions/sync')
      .bearerToken(token)
      .json({
        role_id: testRole.id,
        permission_ids: [perm1.id, perm2.id],
      })

    response.assertStatus(200)
    response.assertBodyContains({
      message: 'Permissions synced successfully',
    })

    // Verify permissions were assigned
    await testRole.load('permissions')
    assert.equal(testRole.permissions.length, 2)
  })

  test('should check user permissions', async ({ client }) => {
    // Create user with specific permissions
    const user = await User.create({
      full_name: 'Test User',
      email: 'testuser@example.com',
      password: 'password123',
    })

    const userRole = await Role.firstOrCreate(
      { slug: IRole.Slugs.USER },
      {
        name: 'User',
        slug: IRole.Slugs.USER,
        description: 'Regular user',
      }
    )

    await user.related('roles').attach([userRole.id])

    // Create permissions
    const readPermission = await Permission.firstOrCreate(
      {
        resource: IPermission.Resources.USERS,
        action: IPermission.Actions.READ,
      },
      {
        name: 'users.read',
        resource: IPermission.Resources.USERS,
        action: IPermission.Actions.READ,
      }
    )

    const updatePermission = await Permission.firstOrCreate(
      {
        resource: IPermission.Resources.USERS,
        action: IPermission.Actions.UPDATE,
      },
      {
        name: 'users.update',
        resource: IPermission.Resources.USERS,
        action: IPermission.Actions.UPDATE,
      }
    )

    const listPermission = await Permission.firstOrCreate(
      {
        resource: IPermission.Resources.PERMISSIONS,
        action: IPermission.Actions.LIST,
      },
      {
        name: 'permissions.list',
        resource: IPermission.Resources.PERMISSIONS,
        action: IPermission.Actions.LIST,
      }
    )

    await userRole
      .related('permissions')
      .sync([readPermission.id, updatePermission.id, listPermission.id])

    // Login
    const loginResponse = await client.post('/api/v1/sessions/sign-in').json({
      uid: 'testuser@example.com',
      password: 'password123',
    })

    const token = loginResponse.body().auth.access_token

    // Check permissions
    const response = await client
      .post(`/api/v1/admin/users/${user.id}/permissions/check`)
      .bearerToken(token)
      .json({
        permissions: ['users.read', 'users.update'],
        require_all: true,
      })

    response.assertStatus(200)
    response.assertBodyContains({
      has_permission: true,
    })

    // Check for permission user doesn't have
    const response2 = await client
      .post(`/api/v1/admin/users/${user.id}/permissions/check`)
      .bearerToken(token)
      .json({
        permissions: ['users.delete'],
        require_all: false,
      })

    response2.assertStatus(200)
    response2.assertBodyContains({
      has_permission: false,
    })
  })

  test('permission middleware should block unauthorized access', async ({ client }) => {
    // Clear Redis cache to ensure test isolation
    const redis = await import('@adonisjs/redis/services/main')
    await redis.default.flushdb()

    // Create user without permissions
    const user = await User.create({
      full_name: 'Limited User',
      email: 'limited@example.com',
      password: 'password123',
    })

    const userRole = await Role.firstOrCreate(
      { slug: IRole.Slugs.USER },
      {
        name: 'User',
        slug: IRole.Slugs.USER,
        description: 'Regular user',
      }
    )

    await user.related('roles').attach([userRole.id])

    // Ensure the user role has no permissions for this test
    await userRole.related('permissions').detach()

    // Login
    const loginResponse = await client.post('/api/v1/sessions/sign-in').json({
      uid: 'limited@example.com',
      password: 'password123',
    })

    const token = loginResponse.body().auth.access_token

    // Try to access a permissions list without permission
    const response = await client.get('/api/v1/admin/permissions').bearerToken(token)

    response.assertStatus(403)
    response.assertBodyContains({
      message: 'Insufficient permissions. Required: permissions.list',
    })
  })
})
