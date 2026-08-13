import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'

import Client from '#modules/clients/models/client'
import Role from '#modules/roles/models/role'
import Tenant from '#modules/tenants/models/tenant'
import User from '#modules/users/models/user'
import IRole from '#modules/roles/interfaces/role_interface'
import { createLegalAdmin } from '#tests/helpers/legal_context'

test.group('Clients API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('creates, lists, updates and soft deletes a tenant client', async ({ client, assert }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]

    const created = await client
      .post('/api/v1/clients')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .json({
        name: 'Banco Exemplo S.A.',
        document: '12.345.678/0001-95',
        person_type: 'company',
        email: 'juridico@example.com',
        address: { city: 'São Paulo', state: 'SP', country: 'BR' },
        metadata: { source: 'manual' },
      })
      .loginAs(user)

    created.assertStatus(201)
    created.assertBodyContains({
      data: {
        tenant_id: tenant.id,
        name: 'Banco Exemplo S.A.',
        document: '12345678000195',
        person_type: 'company',
        metadata: { source: 'manual' },
      },
    })
    const clientId = created.body().data.id as number

    const listed = await client
      .get('/api/v1/clients')
      .header('x-tenant-id', String(tenant.id))
      .qs({ search: 'Banco', person_type: 'company', per_page: 20, sort_by: 'name' })
      .loginAs(user)

    listed.assertStatus(200)
    assert.equal(listed.body().meta.per_page, 20)
    assert.equal(listed.body().data.length, 1)
    assert.equal(listed.body().data[0].id, clientId)

    const updated = await client
      .put(`/api/v1/clients/${clientId}`)
      .header('x-tenant-id', String(tenant.id))
      .json({ name: 'Banco Exemplo Atualizado', metadata: { reviewed: true } })
      .loginAs(user)

    updated.assertStatus(200)
    updated.assertBodyContains({
      data: {
        name: 'Banco Exemplo Atualizado',
        metadata: { source: 'manual', reviewed: true },
      },
    })

    const removed = await client
      .delete(`/api/v1/clients/${clientId}`)
      .header('x-tenant-id', String(tenant.id))
      .loginAs(user)
    removed.assertStatus(204)

    const deletedRow = await db.from('clients').where('id', clientId).firstOrFail()
    assert.isNotNull(deletedRow.deleted_at)

    const missing = await client
      .get(`/api/v1/clients/${clientId}`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .loginAs(user)
    missing.assertStatus(404)
  })

  test('isolates clients between tenants even for a user who belongs to both', async ({
    client,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin(2)
    const [tenantA, tenantB] = tenants
    const foreignClient = await Client.create({
      tenant_id: tenantB.id,
      name: 'Tenant B Client',
      document: '12345678900',
      person_type: 'individual',
      metadata: {},
    })

    const response = await client
      .get(`/api/v1/clients/${foreignClient.id}`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .loginAs(user)

    response.assertStatus(404)
    const list = await client
      .get('/api/v1/clients')
      .header('x-tenant-id', String(tenantA.id))
      .loginAs(user)
    assert.lengthOf(list.body().data, 0)
  })

  test('enforces active uniqueness per tenant and accepts alphanumeric CNPJ', async ({
    client,
  }) => {
    const { user, tenants } = await createLegalAdmin(2)
    const [tenantA, tenantB] = tenants
    const payload = {
      name: 'Empresa Alfa',
      document: 'AB12.CD34/EF56-01',
      person_type: 'company',
    }

    const first = await client
      .post('/api/v1/clients')
      .header('x-tenant-id', String(tenantA.id))
      .json(payload)
      .loginAs(user)
    first.assertStatus(201)
    first.assertBodyContains({ data: { document: 'AB12CD34EF5601' } })

    const duplicate = await client
      .post('/api/v1/clients')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .json(payload)
      .loginAs(user)
    duplicate.assertStatus(409)

    const otherTenant = await client
      .post('/api/v1/clients')
      .header('x-tenant-id', String(tenantB.id))
      .json(payload)
      .loginAs(user)
    otherTenant.assertStatus(201)

    const removed = await client
      .delete(`/api/v1/clients/${first.body().data.id}`)
      .header('x-tenant-id', String(tenantA.id))
      .loginAs(user)
    removed.assertStatus(204)

    const reused = await client
      .post('/api/v1/clients')
      .header('x-tenant-id', String(tenantA.id))
      .json({ ...payload, name: 'Empresa Alfa Recriada' })
      .loginAs(user)
    reused.assertStatus(201)
  })

  test('requires an active tenant and rejects malformed tenant headers', async ({ client }) => {
    const userWithoutTenant = await User.create({
      full_name: 'No Tenant',
      email: 'no-tenant@example.com',
      username: 'no-tenant',
      password: 'password123',
    })

    const missingTenant = await client
      .get('/api/v1/clients')
      .header('Accept', 'application/json')
      .loginAs(userWithoutTenant)
    missingTenant.assertStatus(403)

    const { user } = await createLegalAdmin()
    const malformed = await client
      .get('/api/v1/clients')
      .header('Accept', 'application/json')
      .header('x-tenant-id', 'not-a-number')
      .loginAs(user)
    malformed.assertStatus(400)
  })

  test('validates pagination and document shape at the API boundary', async ({ client }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]

    const invalidPage = await client
      .get('/api/v1/clients')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .qs({ per_page: 101 })
      .loginAs(user)
    invalidPage.assertStatus(422)

    const invalidDocument = await client
      .post('/api/v1/clients')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .json({ name: 'CPF Inválido', document: '123', person_type: 'individual' })
      .loginAs(user)
    invalidDocument.assertStatus(422)
  })

  test('grants regular users legal work but keeps delete and guest access restricted', async ({
    client,
  }) => {
    const tenant = await Tenant.create({
      name: 'RBAC Tenant',
      slug: 'rbac-tenant',
      is_active: true,
    })
    const regularUser = await User.create({
      full_name: 'Regular Legal User',
      email: 'regular-legal@example.com',
      username: 'regular-legal',
      password: 'password123',
    })
    await regularUser.related('tenants').attach({ [tenant.id]: { role: 'member' } })

    const created = await client
      .post('/api/v1/clients')
      .header('x-tenant-id', String(tenant.id))
      .json({ name: 'Cliente RBAC', document: '12345678900', person_type: 'individual' })
      .loginAs(regularUser)
    created.assertStatus(201)

    const deniedDelete = await client
      .delete(`/api/v1/clients/${created.body().data.id}`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .loginAs(regularUser)
    deniedDelete.assertStatus(403)

    const guest = await User.create({
      full_name: 'Legal Guest',
      email: 'legal-guest@example.com',
      username: 'legal-guest',
      password: 'password123',
    })
    const guestRole = await Role.findByOrFail('slug', IRole.Slugs.GUEST)
    await guest.related('roles').sync([guestRole.id])
    await guest.related('tenants').attach({ [tenant.id]: { role: 'member' } })

    const deniedGuest = await client
      .get('/api/v1/clients')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .loginAs(guest)
    deniedGuest.assertStatus(403)
  })
})
