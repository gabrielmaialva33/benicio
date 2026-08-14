import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import Activity from '#modules/activities/models/activity'
import Client from '#modules/clients/models/client'
import Deadline from '#modules/deadlines/models/deadline'
import Folder from '#modules/folders/models/folder'
import Hearing from '#modules/hearings/models/hearing'
import LegalProcess from '#modules/processes/models/process'
import Task from '#modules/tasks/models/task'
import { createLegalAdmin } from '#tests/helpers/legal_context'

test.group('Dashboard API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('composes tenant-scoped live aggregates and operational widgets', async ({
    client,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin(2)
    const [tenantA, tenantB] = tenants
    const now = DateTime.now()

    const activeClient = await Client.create({
      tenant_id: tenantA.id,
      name: 'Cliente ativo',
      document: '12345678901',
      person_type: 'individual',
      metadata: {},
    })
    await Client.create({
      tenant_id: tenantA.id,
      name: 'Cliente sem pasta',
      document: '12345678902',
      person_type: 'individual',
      metadata: {},
    })
    const activeFolder = await Folder.create({
      tenant_id: tenantA.id,
      code: 'DASH-ACTIVE',
      title: 'Pasta ativa',
      status: 'active',
      area: 'Cível',
      client_id: activeClient.id,
      metadata: {},
    })
    await Folder.create({
      tenant_id: tenantA.id,
      code: 'DASH-DONE',
      title: 'Pasta concluída',
      status: 'completed',
      area: 'Trabalhista',
      client_id: activeClient.id,
      metadata: {},
    })
    const process = await LegalProcess.create({
      tenant_id: tenantA.id,
      folder_id: activeFolder.id,
      internal_code: 'DASH-PROC',
      status: 'active',
      is_primary: true,
      metadata: {},
    })

    const urgentTask = await Task.create({
      tenant_id: tenantA.id,
      folder_id: activeFolder.id,
      process_id: process.id,
      creator_id: user.id,
      assignee_id: user.id,
      title: 'Prazo crítico',
      status: 'pending',
      priority: 'urgent',
      due_date: now.minus({ days: 1 }),
      completed_at: null,
      tags: [],
      metadata: {},
    })
    await Task.create({
      tenant_id: tenantA.id,
      folder_id: activeFolder.id,
      creator_id: user.id,
      title: 'Tarefa concluída',
      status: 'completed',
      priority: 'medium',
      due_date: null,
      completed_at: now,
      tags: [],
      metadata: {},
    })
    await Hearing.create({
      tenant_id: tenantA.id,
      process_id: process.id,
      creator_id: user.id,
      title: 'Audiência futura',
      type: 'audience',
      status: 'scheduled',
      starts_at: now.plus({ days: 2 }),
      ends_at: null,
      completed_at: null,
      metadata: {},
    })
    await Deadline.create({
      tenant_id: tenantA.id,
      folder_id: activeFolder.id,
      process_id: process.id,
      creator_id: user.id,
      title: 'Prazo fatal vencido',
      kind: 'judicial',
      status: 'pending',
      priority: 'urgent',
      is_fatal: true,
      due_at: now.minus({ hours: 2 }),
      completed_at: null,
      metadata: {},
    })
    await Activity.create({
      tenant_id: tenantA.id,
      folder_id: activeFolder.id,
      process_id: process.id,
      actor_id: user.id,
      event_type: 'test.activity',
      summary: 'Atividade real',
      data: {},
      occurred_at: now,
    })
    await db.table('folder_favorites').insert({
      tenant_id: tenantA.id,
      user_id: user.id,
      folder_id: activeFolder.id,
    })

    const foreignClient = await Client.create({
      tenant_id: tenantB.id,
      name: 'Cliente estrangeiro',
      document: '12345678903',
      person_type: 'individual',
      metadata: {},
    })
    await Folder.create({
      tenant_id: tenantB.id,
      code: 'DASH-FOREIGN',
      title: 'Não pode aparecer',
      status: 'active',
      area: 'Cível',
      client_id: foreignClient.id,
      metadata: {},
    })

    const response = await client
      .get('/api/v1/dashboard')
      .header('x-tenant-id', String(tenantA.id))
      .loginAs(user)
    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        folders: { total: 2, active: 1, completed: 1, new_this_month: 2 },
        tasks: { total: 2, pending: 1, completed_today: 1, overdue: 1 },
        hearings: { upcoming: 1 },
        deadlines: { open: 1, overdue: 1, fatal_open: 1 },
        clients: { total: 2, active: 1, new_this_month: 2 },
      },
    })
    assert.equal(response.body().data.urgent_tasks[0].id, urgentTask.id)
    assert.equal(response.body().data.upcoming_hearings[0].title, 'Audiência futura')
    assert.equal(response.body().data.upcoming_deadlines[0].title, 'Prazo fatal vencido')
    assert.equal(response.body().data.favorite_folders[0].id, activeFolder.id)
    assert.equal(response.body().data.recent_activity[0].summary, 'Atividade real')
    assert.lengthOf(response.body().data.folders.monthly_evolution, 6)
  })

  test('returns zeroed real aggregates for an empty tenant', async ({ client, assert }) => {
    const { user, tenants } = await createLegalAdmin()
    const response = await client
      .get('/api/v1/dashboard/stats')
      .header('x-tenant-id', String(tenants[0].id))
      .loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        folders: { total: 0, active: 0, completed: 0, new_this_month: 0 },
        tasks: { total: 0, pending: 0, completed_today: 0, overdue: 0 },
        hearings: { upcoming: 0, this_week: 0, this_month: 0 },
        deadlines: { open: 0, overdue: 0, due_this_week: 0, fatal_open: 0 },
        clients: { total: 0, active: 0, new_this_month: 0 },
      },
    })
    assert.deepEqual(response.body().data.folders.by_status, [])
    assert.deepEqual(response.body().data.folders.by_area, [])
    assert.lengthOf(response.body().data.folders.monthly_evolution, 6)
  })
})
