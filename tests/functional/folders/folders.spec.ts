import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'

import Client from '#modules/clients/models/client'
import Folder from '#modules/folders/models/folder'
import User from '#modules/users/models/user'
import { createLegalAdmin } from '#tests/helpers/legal_context'

test.group('Folders API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('creates and returns a folder with tenant-safe relations', async ({ client, assert }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const legalClient = await Client.create({
      tenant_id: tenant.id,
      name: 'Cliente da Pasta',
      document: '12345678900',
      person_type: 'individual',
      metadata: {},
    })

    const created = await client
      .post('/api/v1/folders')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .json({
        code: 'pasta-001',
        title: 'Contencioso principal',
        area: 'Cível Contencioso',
        subarea: 'Bancário',
        client_id: legalClient.id,
        responsible_lawyer_id: user.id,
        metadata: { source: 'manual' },
      })
      .loginAs(user)

    created.assertStatus(201)
    created.assertBodyContains({
      data: {
        tenant_id: tenant.id,
        code: 'PASTA-001',
        status: 'active',
        area: 'Cível Contencioso',
        client: { id: legalClient.id, name: legalClient.name },
        responsible_lawyer: { id: user.id },
      },
    })
    const folderId = created.body().data.id as number

    const listed = await client
      .get('/api/v1/folders')
      .header('x-tenant-id', String(tenant.id))
      .qs({ search: legalClient.name, status: 'active', area: 'cível contencioso' })
      .loginAs(user)
    listed.assertStatus(200)
    assert.equal(listed.body().data.length, 1)
    assert.equal(listed.body().data[0].id, folderId)

    const updated = await client
      .put(`/api/v1/folders/${folderId}`)
      .header('x-tenant-id', String(tenant.id))
      .json({ status: 'pending', metadata: { reviewed: true } })
      .loginAs(user)
    updated.assertStatus(200)
    updated.assertBodyContains({
      data: { status: 'pending', metadata: { source: 'manual', reviewed: true } },
    })

    const removed = await client
      .delete(`/api/v1/folders/${folderId}`)
      .header('x-tenant-id', String(tenant.id))
      .loginAs(user)
    removed.assertStatus(204)

    const deletedRow = await db.from('folders').where('id', folderId).firstOrFail()
    assert.isNotNull(deletedRow.deleted_at)
  })

  test('does not expose folders from another selected tenant', async ({ client, assert }) => {
    const { user, tenants } = await createLegalAdmin(2)
    const [tenantA, tenantB] = tenants
    const legalClient = await Client.create({
      tenant_id: tenantB.id,
      name: 'Cliente B',
      document: '12345678900',
      person_type: 'individual',
      metadata: {},
    })
    const foreignFolder = await Folder.create({
      tenant_id: tenantB.id,
      code: 'B-001',
      title: 'Pasta do tenant B',
      status: 'active',
      area: 'Trabalhista Contencioso',
      client_id: legalClient.id,
      metadata: {},
    })

    const show = await client
      .get(`/api/v1/folders/${foreignFolder.id}`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .loginAs(user)
    show.assertStatus(404)

    const list = await client
      .get('/api/v1/folders')
      .header('x-tenant-id', String(tenantA.id))
      .loginAs(user)
    assert.lengthOf(list.body().data, 0)
  })

  test('rejects cross-tenant clients and responsible lawyers', async ({ client }) => {
    const { user, tenants } = await createLegalAdmin(2)
    const [tenantA, tenantB] = tenants
    const foreignClient = await Client.create({
      tenant_id: tenantB.id,
      name: 'Cliente B',
      document: '12345678900',
      person_type: 'individual',
      metadata: {},
    })

    const wrongClient = await client
      .post('/api/v1/folders')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .json({
        code: 'A-001',
        title: 'Referência cruzada',
        area: 'Cível Contencioso',
        client_id: foreignClient.id,
      })
      .loginAs(user)
    wrongClient.assertStatus(404)

    const localClient = await Client.create({
      tenant_id: tenantA.id,
      name: 'Cliente A',
      document: '98765432100',
      person_type: 'individual',
      metadata: {},
    })
    const foreignLawyer = await User.create({
      full_name: 'Foreign Lawyer',
      email: 'foreign-lawyer@example.com',
      username: 'foreign-lawyer',
      password: 'password123',
    })
    await foreignLawyer.related('tenants').attach({ [tenantB.id]: { role: 'member' } })

    const wrongLawyer = await client
      .post('/api/v1/folders')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .json({
        code: 'A-002',
        title: 'Advogado de outro tenant',
        area: 'Cível Contencioso',
        client_id: localClient.id,
        responsible_lawyer_id: foreignLawyer.id,
      })
      .loginAs(user)
    wrongLawyer.assertStatus(404)
  })

  test('keeps folder codes unique only among active records in the same tenant', async ({
    client,
  }) => {
    const { user, tenants } = await createLegalAdmin(2)
    const [tenantA, tenantB] = tenants
    const clientA = await Client.create({
      tenant_id: tenantA.id,
      name: 'Cliente A',
      document: '12345678900',
      person_type: 'individual',
      metadata: {},
    })
    const clientB = await Client.create({
      tenant_id: tenantB.id,
      name: 'Cliente B',
      document: '12345678900',
      person_type: 'individual',
      metadata: {},
    })

    const createFolder = (tenantId: number, clientId: number) =>
      client
        .post('/api/v1/folders')
        .header('Accept', 'application/json')
        .header('x-tenant-id', String(tenantId))
        .json({
          code: 'shared-001',
          title: 'Pasta compartilhada',
          area: 'Estratégico',
          client_id: clientId,
        })
        .loginAs(user)

    const first = await createFolder(tenantA.id, clientA.id)
    first.assertStatus(201)

    const duplicate = await createFolder(tenantA.id, clientA.id)
    duplicate.assertStatus(409)

    const otherTenant = await createFolder(tenantB.id, clientB.id)
    otherTenant.assertStatus(201)

    const removed = await client
      .delete(`/api/v1/folders/${first.body().data.id}`)
      .header('x-tenant-id', String(tenantA.id))
      .loginAs(user)
    removed.assertStatus(204)

    const reused = await createFolder(tenantA.id, clientA.id)
    reused.assertStatus(201)
  })

  test('blocks deleting a client while an active folder references it', async ({ client }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const legalClient = await Client.create({
      tenant_id: tenant.id,
      name: 'Cliente com pasta',
      document: '12345678900',
      person_type: 'individual',
      metadata: {},
    })
    await Folder.create({
      tenant_id: tenant.id,
      code: 'LOCK-001',
      title: 'Pasta ativa',
      status: 'active',
      area: 'Cível Contencioso',
      client_id: legalClient.id,
      metadata: {},
    })

    const response = await client
      .delete(`/api/v1/clients/${legalClient.id}`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .loginAs(user)

    response.assertStatus(409)
  })
})
