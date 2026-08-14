import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'

import Client from '#modules/clients/models/client'
import Folder from '#modules/folders/models/folder'
import LegalProcess from '#modules/processes/models/process'
import { createLegalAdmin } from '#tests/helpers/legal_context'

async function createMatter(tenantId: number, suffix: string) {
  const legalClient = await Client.create({
    tenant_id: tenantId,
    name: `Cliente ${suffix}`,
    document: suffix.padStart(11, '0').slice(-11),
    person_type: 'individual',
    metadata: {},
  })
  const folder = await Folder.create({
    tenant_id: tenantId,
    code: `MOVEMENT-${suffix}`,
    title: `Pasta ${suffix}`,
    status: 'active',
    area: 'Cível',
    client_id: legalClient.id,
    metadata: {},
  })
  const process = await LegalProcess.create({
    tenant_id: tenantId,
    folder_id: folder.id,
    internal_code: `MOVEMENT-PROC-${suffix}`,
    status: 'active',
    is_primary: true,
    metadata: {},
  })

  return { folder, process }
}

test.group('Movements and activities API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('records canonical movements and exposes an append-only cursor timeline', async ({
    client,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const { folder, process } = await createMatter(tenant.id, '501')

    const first = await client
      .post(`/api/v1/processes/${process.id}/movements`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .json({
        occurred_at: '2026-08-01T12:00:00.000Z',
        kind: 'publication',
        title: 'Publicação no diário oficial',
        source: 'court',
        external_id: 'court-event-501',
        metadata: { court: 'TJSP' },
      })
      .loginAs(user)
    first.assertStatus(201)
    first.assertBodyContains({
      data: {
        tenant_id: tenant.id,
        process_id: process.id,
        created_by: user.id,
        source: 'court',
        external_id: 'court-event-501',
      },
    })
    const movementId = first.body().data.id as number

    const replay = await client
      .post(`/api/v1/processes/${process.id}/movements`)
      .header('x-tenant-id', String(tenant.id))
      .json({
        occurred_at: '2026-08-01T12:00:00.000Z',
        kind: 'publication',
        title: 'Publicação repetida',
        source: 'court',
        external_id: 'court-event-501',
      })
      .loginAs(user)
    replay.assertStatus(201)
    assert.equal(replay.body().data.id, movementId)
    const movementCount = await db
      .from('process_movements')
      .where({ tenant_id: tenant.id })
      .count('*')
      .firstOrFail()
    assert.equal(Number(movementCount.count), 1)

    const updated = await client
      .put(`/api/v1/movements/${movementId}`)
      .header('x-tenant-id', String(tenant.id))
      .json({ title: 'Publicação confirmada', metadata: { reviewed: true } })
      .loginAs(user)
    updated.assertStatus(200)
    updated.assertBodyContains({
      data: { title: 'Publicação confirmada', metadata: { court: 'TJSP', reviewed: true } },
    })

    const timelinePage = await client
      .get(`/api/v1/folders/${folder.id}/activities`)
      .header('x-tenant-id', String(tenant.id))
      .qs({ limit: 1 })
      .loginAs(user)
    timelinePage.assertStatus(200)
    timelinePage.assertBodyContains({ meta: { has_more: true } })
    assert.equal(timelinePage.body().data[0].event_type, 'process.movement.updated')
    assert.isString(timelinePage.body().meta.next_cursor)

    const nextPage = await client
      .get(`/api/v1/folders/${folder.id}/activities`)
      .header('x-tenant-id', String(tenant.id))
      .qs({ limit: 1, cursor: timelinePage.body().meta.next_cursor })
      .loginAs(user)
    nextPage.assertStatus(200)
    nextPage.assertBodyContains({ meta: { has_more: false, next_cursor: null } })
    assert.equal(nextPage.body().data[0].event_type, 'process.movement.created')

    const removed = await client
      .delete(`/api/v1/movements/${movementId}`)
      .header('x-tenant-id', String(tenant.id))
      .loginAs(user)
    removed.assertStatus(204)
    const deletedMovement = await db.from('process_movements').where('id', movementId).firstOrFail()
    const activityCount = await db
      .from('activities')
      .where({ tenant_id: tenant.id })
      .count('*')
      .firstOrFail()
    assert.isNotNull(deletedMovement.deleted_at)
    assert.equal(Number(activityCount.count), 3)
  })

  test('rejects invalid cursors and isolates movement references by tenant', async ({ client }) => {
    const { user, tenants } = await createLegalAdmin(2)
    const [tenantA, tenantB] = tenants
    const matterA = await createMatter(tenantA.id, '511')
    const matterB = await createMatter(tenantB.id, '512')

    const crossTenant = await client
      .post(`/api/v1/processes/${matterB.process.id}/movements`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .json({
        occurred_at: '2026-08-01T12:00:00.000Z',
        kind: 'order',
        title: 'Referência cruzada',
      })
      .loginAs(user)
    crossTenant.assertStatus(404)

    const invalidCursor = await client
      .get(`/api/v1/processes/${matterA.process.id}/activities`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .qs({ cursor: 'not-a-cursor' })
      .loginAs(user)
    invalidCursor.assertStatus(422)
  })
})
