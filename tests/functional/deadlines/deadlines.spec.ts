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
    code: `DEADLINE-${suffix}`,
    title: `Pasta ${suffix}`,
    status: 'active',
    area: 'Cível',
    client_id: legalClient.id,
    metadata: {},
  })
  const process = await LegalProcess.create({
    tenant_id: tenantId,
    folder_id: folder.id,
    internal_code: `DEADLINE-PROC-${suffix}`,
    status: 'active',
    is_primary: true,
    metadata: {},
  })

  return { folder, process }
}

test.group('Deadlines API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('derives the folder, filters and completes a process deadline', async ({
    client,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const { folder, process } = await createMatter(tenant.id, '401')

    const created = await client
      .post('/api/v1/deadlines')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .json({
        process_id: process.id,
        assignee_id: user.id,
        title: 'Prazo para contestação',
        kind: 'judicial',
        priority: 'urgent',
        is_fatal: true,
        due_at: '2026-09-15T23:59:00.000Z',
        legal_basis: 'CPC art. 335',
        metadata: { source: 'manual' },
      })
      .loginAs(user)

    created.assertStatus(201)
    created.assertBodyContains({
      data: {
        tenant_id: tenant.id,
        folder_id: folder.id,
        process_id: process.id,
        creator_id: user.id,
        assignee_id: user.id,
        status: 'pending',
        priority: 'urgent',
        is_fatal: true,
      },
    })
    const deadlineId = created.body().data.id as number

    const listed = await client
      .get('/api/v1/deadlines')
      .header('x-tenant-id', String(tenant.id))
      .qs({ folder_id: folder.id, is_fatal: true, priority: 'urgent' })
      .loginAs(user)
    listed.assertStatus(200)
    assert.deepEqual(
      listed.body().data.map((deadline: { id: number }) => deadline.id),
      [deadlineId]
    )

    const completed = await client
      .patch(`/api/v1/deadlines/${deadlineId}/complete`)
      .header('x-tenant-id', String(tenant.id))
      .json({ completed: true })
      .loginAs(user)
    completed.assertStatus(200)
    assert.isNotNull(completed.body().data.completed_at)

    const reopened = await client
      .patch(`/api/v1/deadlines/${deadlineId}/complete`)
      .header('x-tenant-id', String(tenant.id))
      .json({ completed: false })
      .loginAs(user)
    reopened.assertStatus(200)
    assert.isNull(reopened.body().data.completed_at)

    const removed = await client
      .delete(`/api/v1/deadlines/${deadlineId}`)
      .header('x-tenant-id', String(tenant.id))
      .loginAs(user)
    removed.assertStatus(204)
    const deletedDeadline = await db.from('deadlines').where('id', deadlineId).firstOrFail()
    assert.isNotNull(deletedDeadline.deleted_at)
  })

  test('rejects mismatched references and hides deadlines across tenants', async ({ client }) => {
    const { user, tenants } = await createLegalAdmin(2)
    const [tenantA, tenantB] = tenants
    const matterA = await createMatter(tenantA.id, '411')
    const matterB = await createMatter(tenantB.id, '412')

    const mismatch = await client
      .post('/api/v1/deadlines')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .json({
        folder_id: matterA.folder.id,
        process_id: matterB.process.id,
        title: 'Referência cruzada',
        kind: 'judicial',
        due_at: '2026-09-15T23:59:00.000Z',
      })
      .loginAs(user)
    mismatch.assertStatus(404)

    const created = await client
      .post('/api/v1/deadlines')
      .header('x-tenant-id', String(tenantA.id))
      .json({
        folder_id: matterA.folder.id,
        title: 'Prazo interno',
        kind: 'internal',
        due_at: '2026-09-15T23:59:00.000Z',
      })
      .loginAs(user)
    created.assertStatus(201)

    const hidden = await client
      .get(`/api/v1/deadlines/${created.body().data.id}`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantB.id))
      .loginAs(user)
    hidden.assertStatus(404)
  })
})
