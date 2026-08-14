import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'

import Client from '#modules/clients/models/client'
import Folder from '#modules/folders/models/folder'
import LegalProcess from '#modules/processes/models/process'
import { createLegalAdmin } from '#tests/helpers/legal_context'

async function createMatter(tenantId: number, suffix: string) {
  const client = await Client.create({
    tenant_id: tenantId,
    name: `Cliente ${suffix}`,
    document: suffix.padStart(11, '0').slice(-11),
    person_type: 'individual',
    metadata: {},
  })
  const folder = await Folder.create({
    tenant_id: tenantId,
    code: `TASK-${suffix}`,
    title: `Pasta ${suffix}`,
    status: 'active',
    area: 'Cível',
    client_id: client.id,
    metadata: {},
  })
  const process = await LegalProcess.create({
    tenant_id: tenantId,
    folder_id: folder.id,
    internal_code: `TASK-PROC-${suffix}`,
    status: 'active',
    is_primary: true,
    metadata: {},
  })
  return { folder, process }
}

test.group('Tasks API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('creates, filters, updates status and soft deletes a tenant task', async ({
    client,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const { folder, process } = await createMatter(tenant.id, '101')

    const created = await client
      .post('/api/v1/tasks')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .json({
        title: 'Protocolar contestação',
        description: 'Revisar anexos antes do protocolo',
        priority: 'urgent',
        due_date: '2026-09-01T15:00:00.000Z',
        process_id: process.id,
        assignee_id: user.id,
        tags: ['contencioso', 'contencioso'],
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
        tags: ['contencioso'],
      },
    })
    const taskId = created.body().data.id as number

    const listed = await client
      .get('/api/v1/tasks')
      .header('x-tenant-id', String(tenant.id))
      .qs({ status: 'pending', priority: 'urgent', process_id: process.id })
      .loginAs(user)
    listed.assertStatus(200)
    assert.deepEqual(
      listed.body().data.map((task: { id: number }) => task.id),
      [taskId]
    )

    const completed = await client
      .patch(`/api/v1/tasks/${taskId}/status`)
      .header('x-tenant-id', String(tenant.id))
      .json({ status: 'completed' })
      .loginAs(user)
    completed.assertStatus(200)
    assert.isNotNull(completed.body().data.completed_at)

    const reopened = await client
      .put(`/api/v1/tasks/${taskId}`)
      .header('x-tenant-id', String(tenant.id))
      .json({ status: 'in_progress', metadata: { reviewed: true } })
      .loginAs(user)
    reopened.assertStatus(200)
    reopened.assertBodyContains({
      data: { status: 'in_progress', metadata: { source: 'manual', reviewed: true } },
    })
    assert.isNull(reopened.body().data.completed_at)

    const removed = await client
      .delete(`/api/v1/tasks/${taskId}`)
      .header('x-tenant-id', String(tenant.id))
      .loginAs(user)
    removed.assertStatus(204)
    const deletedTask = await db.from('tasks').where('id', taskId).firstOrFail()
    assert.isNotNull(deletedTask.deleted_at)
  })

  test('hides tasks and rejects references across tenants', async ({ client }) => {
    const { user, tenants } = await createLegalAdmin(2)
    const [tenantA, tenantB] = tenants
    const matterA = await createMatter(tenantA.id, '201')
    const matterB = await createMatter(tenantB.id, '202')

    const created = await client
      .post('/api/v1/tasks')
      .header('x-tenant-id', String(tenantA.id))
      .json({ title: 'Tarefa A', folder_id: matterA.folder.id })
      .loginAs(user)
    created.assertStatus(201)

    const hidden = await client
      .get(`/api/v1/tasks/${created.body().data.id}`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantB.id))
      .loginAs(user)
    hidden.assertStatus(404)

    const wrongFolder = await client
      .post('/api/v1/tasks')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .json({ title: 'Referência cruzada', folder_id: matterB.folder.id })
      .loginAs(user)
    wrongFolder.assertStatus(404)

    const mismatchedMatter = await client
      .post('/api/v1/tasks')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .json({
        title: 'Processo em pasta errada',
        folder_id: matterA.folder.id,
        process_id: matterB.process.id,
      })
      .loginAs(user)
    mismatchedMatter.assertStatus(404)
  })
})
