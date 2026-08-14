import hash from '@adonisjs/core/services/hash'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'
import { test } from '@japa/runner'

import {
  LEGAL_DEMO_PASSWORD,
  LEGAL_DEMO_SEED_KEY,
  legalDemoTenant,
} from '#database/fixtures/legal_demo'
import { seedLegalDemo } from '#database/seed_support/legal_demo_seed'
import { isValidCnj } from '#modules/processes/domain/cnj'
import User from '#modules/users/models/user'

const EXPECTED_SUMMARY = {
  users: 9,
  clients: 8,
  folders: 8,
  processes: 8,
  parties: 16,
  tasks: 6,
  hearings: 5,
  deadlines: 6,
  movements: 5,
  activities: 13,
  documents: 6,
  messages: 5,
  notifications: 7,
  favorites: 10,
  auditLogs: 4,
}

async function countRows(
  client: QueryClientContract,
  table: string,
  tenantId: number
): Promise<number> {
  const row = await client.from(table).where('tenant_id', tenantId).count('* as total').first()
  return Number(row?.total ?? 0)
}

test.group('Legal demo database seed', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('adapts the legacy scenario to canonical contracts and stays idempotent', async ({
    assert,
  }) => {
    const client = db.connection()
    assert.isTrue(client.isTransaction)

    const firstRun = await seedLegalDemo(client)
    const secondRun = await seedLegalDemo(client)
    const { tenantId, ...firstCounts } = firstRun

    assert.deepEqual(firstCounts, EXPECTED_SUMMARY)
    assert.deepEqual(secondRun, firstRun)

    const tenant = await client
      .from('tenants')
      .where('slug', legalDemoTenant.slug)
      .select('id', 'name')
      .first()
    assert.equal(Number(tenant?.id), tenantId)
    assert.equal(tenant?.name, legalDemoTenant.name)

    const expectedTenantCounts: Record<string, number> = {
      user_tenants: 9,
      clients: 8,
      folders: 8,
      processes: 8,
      process_parties: 16,
      tasks: 6,
      hearings: 5,
      hearing_attendees: 9,
      deadlines: 6,
      process_movements: 5,
      activities: 13,
      files: 6,
      legal_documents: 6,
      messages: 5,
      notifications: 7,
      folder_favorites: 10,
    }

    for (const [table, expected] of Object.entries(expectedTenantCounts)) {
      assert.equal(await countRows(client, table, tenantId), expected, table)
    }

    const seededAuditLogs = await client
      .from('audit_logs')
      .whereLike('session_id', `${LEGAL_DEMO_SEED_KEY}:%`)
      .count('* as total')
      .first()
    assert.equal(Number(seededAuditLogs?.total), 4)

    const admin = await User.findByOrFail('email', 'admin@benicio.com.br', { client })
    assert.isTrue(await hash.verify(admin.password, LEGAL_DEMO_PASSWORD))

    const membership = await client
      .from('user_tenants')
      .where('tenant_id', tenantId)
      .where('user_id', admin.id)
      .select('role')
      .first()
    assert.equal(membership?.role, 'owner')

    const adminRoles = await client
      .from('roles')
      .innerJoin('user_roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', admin.id)
      .orderBy('roles.slug')
      .select('roles.slug')
    assert.deepEqual(
      adminRoles.map((role) => role.slug),
      ['root', 'user']
    )

    const tenantMismatches = [
      await client
        .from('folders as folders')
        .innerJoin('clients as clients', 'clients.id', 'folders.client_id')
        .where('folders.tenant_id', tenantId)
        .whereRaw('folders.tenant_id <> clients.tenant_id')
        .count('* as total')
        .first(),
      await client
        .from('processes as processes')
        .innerJoin('folders as folders', 'folders.id', 'processes.folder_id')
        .where('processes.tenant_id', tenantId)
        .whereRaw('processes.tenant_id <> folders.tenant_id')
        .count('* as total')
        .first(),
      await client
        .from('process_parties as parties')
        .innerJoin('processes as processes', 'processes.id', 'parties.process_id')
        .where('parties.tenant_id', tenantId)
        .whereRaw('parties.tenant_id <> processes.tenant_id')
        .count('* as total')
        .first(),
    ]
    assert.deepEqual(
      tenantMismatches.map((row) => Number(row?.total ?? 0)),
      [0, 0, 0]
    )

    const processes = await client
      .from('processes')
      .where('tenant_id', tenantId)
      .select('id', 'cnj_number', 'legacy_number', 'internal_code')
    for (const process of processes) {
      assert.isTrue(Boolean(process.cnj_number || process.legacy_number || process.internal_code))
      if (process.cnj_number) {
        assert.isTrue(isValidCnj(process.cnj_number))
      }
    }

    const partyGroups = await client
      .from('process_parties')
      .where('tenant_id', tenantId)
      .where('is_primary', true)
      .groupBy('process_id')
      .select('process_id')
      .count('* as total')
      .countDistinct('side as side_total')
    assert.lengthOf(partyGroups, EXPECTED_SUMMARY.processes)
    for (const partyGroup of partyGroups) {
      assert.equal(Number(partyGroup.total), 2)
      assert.equal(Number(partyGroup.side_total), 2)
    }

    const documents = await client
      .from('files')
      .where('tenant_id', tenantId)
      .select('file_name', 'file_type', 'url')
    assert.isTrue(
      documents.every(
        (document) =>
          document.file_type === 'text/markdown' && document.url.startsWith('/yol/demo-documents/')
      )
    )

    for (const table of ['auth_access_tokens', 'refresh_tokens', 'rate_limits']) {
      const row = await client.from(table).count('* as total').first()
      assert.equal(Number(row?.total ?? 0), 0, table)
    }
  })
})
