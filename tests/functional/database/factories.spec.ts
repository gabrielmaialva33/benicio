import hash from '@adonisjs/core/services/hash'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import * as DatabaseFactories from '#database/factories/index'
import {
  ClientFactory,
  DeadlineFactory,
  FACTORY_USER_PASSWORD,
  FolderFactory,
  HearingFactory,
  ProcessFactory,
  RoleFactory,
  TaskFactory,
  TenantFactory,
  UserFactory,
} from '#database/factories/index'
import { LEGACY_FACTORY_PARITY } from '#database/fixtures/legacy_parity'
import { isValidCnj } from '#modules/processes/domain/cnj'

test.group('Canonical database factories', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('exports more factories and executable states than the legacy API', async ({ assert }) => {
    const exportedFactories = Object.keys(DatabaseFactories).filter((name) =>
      name.endsWith('Factory')
    )
    assert.isAtLeast(exportedFactories.length, LEGACY_FACTORY_PARITY.exportedFactories)
    assert.deepEqual(exportedFactories.sort(), [
      'ClientFactory',
      'DeadlineFactory',
      'FolderFactory',
      'HearingFactory',
      'ProcessFactory',
      'RoleFactory',
      'TaskFactory',
      'TenantFactory',
      'UserFactory',
    ])

    const stateModels = await Promise.all([
      TenantFactory.apply('inactive').make(),
      TenantFactory.apply('lawFirm').make(),
      UserFactory.apply('verified').make(),
      UserFactory.apply('unverified').make(),
      UserFactory.apply('admin').make(),
      UserFactory.apply('lawyer').make(),
      UserFactory.apply('secretary').make(),
      UserFactory.apply('intern').make(),
      UserFactory.apply('deleted').make(),
      RoleFactory.apply('root').make(),
      RoleFactory.apply('admin').make(),
      RoleFactory.apply('user').make(),
      RoleFactory.apply('guest').make(),
      RoleFactory.apply('editor').make(),
      ClientFactory.apply('individual').make(),
      ClientFactory.apply('company').make(),
      ClientFactory.apply('vip').make(),
      ClientFactory.apply('deleted').make(),
      FolderFactory.apply('active').make(),
      FolderFactory.apply('completed').make(),
      FolderFactory.apply('pending').make(),
      FolderFactory.apply('archived').make(),
      FolderFactory.apply('regulatory').make(),
      FolderFactory.apply('precatorio').make(),
      FolderFactory.apply('deleted').make(),
      ProcessFactory.apply('active').make(),
      ProcessFactory.apply('closed').make(),
      ProcessFactory.apply('appeal').make(),
      ProcessFactory.apply('execution').make(),
      ProcessFactory.apply('legacy').make(),
      ProcessFactory.apply('deleted').make(),
      TaskFactory.apply('urgent').make(),
      TaskFactory.apply('overdue').make(),
      TaskFactory.apply('completed').make(),
      TaskFactory.apply('inProgress').make(),
      TaskFactory.apply('deleted').make(),
      HearingFactory.apply('upcoming').make(),
      HearingFactory.apply('completed').make(),
      HearingFactory.apply('online').make(),
      HearingFactory.apply('audience').make(),
      HearingFactory.apply('judgment').make(),
      HearingFactory.apply('conciliation').make(),
      HearingFactory.apply('cancelled').make(),
      HearingFactory.apply('deleted').make(),
      DeadlineFactory.apply('fatal').make(),
      DeadlineFactory.apply('overdue').make(),
      DeadlineFactory.apply('completed').make(),
      DeadlineFactory.apply('judicial').make(),
      DeadlineFactory.apply('administrative').make(),
      DeadlineFactory.apply('deleted').make(),
    ])

    assert.isAtLeast(stateModels.length, LEGACY_FACTORY_PARITY.legacyStates)
    assert.lengthOf(stateModels, 50)
  })

  test('persists a tenant-safe legal graph with valid identifiers', async ({ assert }) => {
    const tenant = await TenantFactory.apply('lawFirm').create()
    const lawyer = await UserFactory.apply('lawyer', 'verified').create()
    await lawyer.related('tenants').attach({ [tenant.id]: { role: 'member' } })

    const client = await ClientFactory.apply('company').merge({ tenant_id: tenant.id }).create()
    const folder = await FolderFactory.apply('active', 'regulatory')
      .merge({
        tenant_id: tenant.id,
        client_id: client.id,
        responsible_lawyer_id: lawyer.id,
      })
      .create()
    const process = await ProcessFactory.apply('active', 'execution')
      .merge({ tenant_id: tenant.id, folder_id: folder.id })
      .create()
    const task = await TaskFactory.apply('overdue')
      .merge({
        tenant_id: tenant.id,
        folder_id: folder.id,
        process_id: process.id,
        assignee_id: lawyer.id,
        creator_id: lawyer.id,
      })
      .create()
    const hearing = await HearingFactory.apply('upcoming', 'online')
      .merge({
        tenant_id: tenant.id,
        process_id: process.id,
        creator_id: lawyer.id,
      })
      .create()
    const deadline = await DeadlineFactory.apply('fatal', 'overdue')
      .merge({
        tenant_id: tenant.id,
        folder_id: folder.id,
        process_id: process.id,
        assignee_id: lawyer.id,
        creator_id: lawyer.id,
      })
      .create()

    assert.isTrue(await hash.verify(lawyer.password, FACTORY_USER_PASSWORD))
    assert.isTrue(lawyer.email_verified)
    assert.match(client.document, /^\d{14}$/)
    assert.isTrue(isValidCnj(process.cnj_number!))
    assert.equal(folder.area, 'Regulatório')
    assert.equal(folder.client_id, client.id)
    assert.equal(process.folder_id, folder.id)
    assert.equal(task.status, 'pending')
    assert.isTrue(task.due_date! < DateTime.now())
    assert.equal(hearing.status, 'scheduled')
    assert.match(hearing.online_url!, /^https:\/\/meet\.example\.com\//)
    assert.isTrue(deadline.is_fatal)
    assert.equal(deadline.priority, 'urgent')
    assert.isTrue(deadline.due_at < DateTime.now())

    for (const model of [client, folder, process, task, hearing, deadline]) {
      assert.equal(model.tenant_id, tenant.id)
    }
  })
})
