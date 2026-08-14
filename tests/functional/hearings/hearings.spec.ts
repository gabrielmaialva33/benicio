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
    code: `HEARING-${suffix}`,
    title: `Pasta ${suffix}`,
    status: 'active',
    area: 'Cível',
    client_id: legalClient.id,
    metadata: {},
  })
  const process = await LegalProcess.create({
    tenant_id: tenantId,
    folder_id: folder.id,
    internal_code: `HEARING-PROC-${suffix}`,
    status: 'active',
    is_primary: true,
    metadata: {},
  })

  return { folder, process }
}

test.group('Hearings API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('manages a hearing with attendees and completion lifecycle', async ({ client, assert }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const { folder, process } = await createMatter(tenant.id, '301')

    const created = await client
      .post(`/api/v1/processes/${process.id}/hearings`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .json({
        title: 'Audiência de instrução',
        type: 'instruction',
        starts_at: '2026-09-10T13:00:00.000Z',
        ends_at: '2026-09-10T14:30:00.000Z',
        location: 'Fórum Central',
        attendees: [{ user_id: user.id, role: 'advogado', is_required: true }],
        metadata: { source: 'manual' },
      })
      .loginAs(user)

    created.assertStatus(201)
    created.assertBodyContains({
      data: {
        tenant_id: tenant.id,
        process_id: process.id,
        creator_id: user.id,
        status: 'scheduled',
        type: 'instruction',
        metadata: { source: 'manual' },
      },
    })
    assert.deepEqual(
      created.body().data.attendees.map((attendee: { id: number }) => attendee.id),
      [user.id]
    )
    const hearingId = created.body().data.id as number

    const listed = await client
      .get('/api/v1/hearings')
      .header('x-tenant-id', String(tenant.id))
      .qs({ folder_id: folder.id, attendee_id: user.id, status: 'scheduled' })
      .loginAs(user)
    listed.assertStatus(200)
    assert.deepEqual(
      listed.body().data.map((hearing: { id: number }) => hearing.id),
      [hearingId]
    )

    const completed = await client
      .patch(`/api/v1/hearings/${hearingId}/status`)
      .header('x-tenant-id', String(tenant.id))
      .json({ status: 'completed' })
      .loginAs(user)
    completed.assertStatus(200)
    assert.isNotNull(completed.body().data.completed_at)

    const reopened = await client
      .put(`/api/v1/hearings/${hearingId}`)
      .header('x-tenant-id', String(tenant.id))
      .json({ status: 'postponed', metadata: { rescheduled: true }, attendees: [] })
      .loginAs(user)
    reopened.assertStatus(200)
    reopened.assertBodyContains({
      data: { status: 'postponed', metadata: { source: 'manual', rescheduled: true } },
    })
    assert.isNull(reopened.body().data.completed_at)
    assert.deepEqual(reopened.body().data.attendees, [])

    const removed = await client
      .delete(`/api/v1/hearings/${hearingId}`)
      .header('x-tenant-id', String(tenant.id))
      .loginAs(user)
    removed.assertStatus(204)
    assert.isNotNull((await db.from('hearings').where('id', hearingId).firstOrFail()).deleted_at)
  })

  test('rejects invalid ranges and hides hearings across tenants', async ({ client }) => {
    const { user, tenants } = await createLegalAdmin(2)
    const [tenantA, tenantB] = tenants
    const matterA = await createMatter(tenantA.id, '311')
    const matterB = await createMatter(tenantB.id, '312')

    const invalidRange = await client
      .post('/api/v1/hearings')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .json({
        process_id: matterA.process.id,
        title: 'Horário inválido',
        type: 'audience',
        starts_at: '2026-09-10T15:00:00.000Z',
        ends_at: '2026-09-10T14:00:00.000Z',
      })
      .loginAs(user)
    invalidRange.assertStatus(422)

    const crossTenant = await client
      .post('/api/v1/hearings')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .json({
        process_id: matterB.process.id,
        title: 'Referência cruzada',
        type: 'audience',
        starts_at: '2026-09-10T15:00:00.000Z',
      })
      .loginAs(user)
    crossTenant.assertStatus(404)

    const created = await client
      .post('/api/v1/hearings')
      .header('x-tenant-id', String(tenantA.id))
      .json({
        process_id: matterA.process.id,
        title: 'Audiência A',
        type: 'audience',
        starts_at: '2026-09-10T15:00:00.000Z',
      })
      .loginAs(user)
    created.assertStatus(201)

    const hidden = await client
      .get(`/api/v1/hearings/${created.body().data.id}`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantB.id))
      .loginAs(user)
    hidden.assertStatus(404)
  })
})
