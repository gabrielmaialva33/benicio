import hash from '@adonisjs/core/services/hash'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'
import { test } from '@japa/runner'

import {
  LEGAL_DEMO_PASSWORD,
  LEGAL_DEMO_SEED_KEY,
  legalDemoTenant,
  legalDemoUsers,
} from '#database/fixtures/legal_demo'
import {
  legalDemoDirectPermissions,
  legalDemoRateLimits,
  legalDemoSpecialPermissions,
  legalDemoTokenUsers,
} from '#database/fixtures/legal_demo_infrastructure'
import { LEGACY_REALISTIC_PARITY } from '#database/fixtures/legacy_parity'
import { seedLegalDemo, type LegalDemoSeedSummary } from '#database/seed_support/legal_demo_seed'
import { isValidCnj } from '#modules/processes/domain/cnj'
import User from '#modules/users/models/user'

const EXPECTED_SUMMARY = {
  users: 10,
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
  specialPermissions: 21,
  userPermissions: 6,
  authTokens: 16,
  sessionRefreshTokens: 8,
  standaloneFiles: 15,
  rateLimits: 15,
  auditLogs: 154,
} satisfies Omit<LegalDemoSeedSummary, 'tenantId'>

const MANAGED_TABLES = [
  'users',
  'user_tenants',
  'user_roles',
  'clients',
  'folders',
  'processes',
  'process_parties',
  'tasks',
  'hearings',
  'hearing_attendees',
  'deadlines',
  'process_movements',
  'activities',
  'files',
  'legal_documents',
  'messages',
  'notifications',
  'folder_favorites',
  'permissions',
  'role_permissions',
  'user_permissions',
  'auth_access_tokens',
  'refresh_tokens',
  'rate_limits',
  'audit_logs',
] as const

async function countRows(
  client: QueryClientContract,
  table: string,
  tenantId?: number
): Promise<number> {
  const query = client.from(table)
  if (tenantId !== undefined) query.where('tenant_id', tenantId)
  const row = await query.count('* as total').first()
  return Number(row?.total ?? 0)
}

async function snapshotRowCounts(client: QueryClientContract): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const table of MANAGED_TABLES) counts[table] = await countRows(client, table)
  return counts
}

function resolvedRateLimitKeys(userIds: Record<string, number>): string[] {
  const userIdBySlot = {
    '1': userIds.admin,
    '2': userIds.andre,
    '3': userIds.marcos,
  }
  return legalDemoRateLimits.map(([key]) => {
    const match = key.match(/:user:([123])/)
    if (!match) return key
    const slot = match[1] as keyof typeof userIdBySlot
    return key.replace(`:user:${slot}`, `:user:${userIdBySlot[slot]}`)
  })
}

test.group('Legal demo database seed', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('preserves every realistic legacy category and adds canonical data', async ({ assert }) => {
    const client = db.connection()
    assert.isTrue(client.isTransaction)

    const firstRun = await seedLegalDemo(client)
    const { tenantId, ...firstCounts } = firstRun
    assert.deepEqual(firstCounts, EXPECTED_SUMMARY)

    const parityActual: Record<keyof typeof LEGACY_REALISTIC_PARITY, number> = {
      users: firstRun.users,
      clients: firstRun.clients,
      folders: firstRun.folders,
      processes: firstRun.processes,
      documents: firstRun.documents,
      movements: firstRun.movements,
      tasks: firstRun.tasks,
      hearings: firstRun.hearings,
      messages: firstRun.messages,
      notifications: firstRun.notifications,
      favorites: firstRun.favorites,
      authTokens: firstRun.authTokens,
      files: firstRun.standaloneFiles,
      specialPermissions: firstRun.specialPermissions,
      userPermissions: firstRun.userPermissions,
      rateLimits: firstRun.rateLimits,
      auditLogs: firstRun.auditLogs,
    }

    for (const [category, minimum] of Object.entries(LEGACY_REALISTIC_PARITY)) {
      assert.isAtLeast(parityActual[category as keyof typeof parityActual], minimum, category)
    }

    const tenant = await client
      .from('tenants')
      .where('slug', legalDemoTenant.slug)
      .select('id', 'name')
      .first()
    assert.equal(Number(tenant?.id), tenantId)
    assert.equal(tenant?.name, legalDemoTenant.name)

    const expectedTenantMinimums: Record<string, number> = {
      user_tenants: EXPECTED_SUMMARY.users,
      clients: EXPECTED_SUMMARY.clients,
      folders: EXPECTED_SUMMARY.folders,
      processes: EXPECTED_SUMMARY.processes,
      process_parties: EXPECTED_SUMMARY.parties,
      tasks: EXPECTED_SUMMARY.tasks,
      hearings: EXPECTED_SUMMARY.hearings,
      hearing_attendees: 9,
      deadlines: EXPECTED_SUMMARY.deadlines,
      process_movements: EXPECTED_SUMMARY.movements,
      activities: EXPECTED_SUMMARY.activities,
      files: EXPECTED_SUMMARY.documents + EXPECTED_SUMMARY.standaloneFiles,
      legal_documents: EXPECTED_SUMMARY.documents,
      messages: EXPECTED_SUMMARY.messages,
      notifications: EXPECTED_SUMMARY.notifications,
      folder_favorites: EXPECTED_SUMMARY.favorites,
    }

    for (const [table, minimum] of Object.entries(expectedTenantMinimums)) {
      assert.isAtLeast(await countRows(client, table, tenantId), minimum, table)
    }

    const seededAuditLogs = await client
      .from('audit_logs')
      .whereLike('session_id', `${LEGAL_DEMO_SEED_KEY}:%`)
      .count('* as total')
      .first()
    assert.equal(Number(seededAuditLogs?.total), EXPECTED_SUMMARY.auditLogs)

    const seededFiles = await client
      .from('files')
      .where('tenant_id', tenantId)
      .whereLike('file_name', 'demo/files/%')
      .count('* as total')
      .first()
    assert.equal(Number(seededFiles?.total), EXPECTED_SUMMARY.standaloneFiles)

    const specialPermissionNames = legalDemoSpecialPermissions.map(([name]) => name)
    assert.equal(
      await client
        .from('permissions')
        .whereIn('name', specialPermissionNames)
        .count('* as total')
        .first()
        .then((row) => Number(row?.total ?? 0)),
      EXPECTED_SUMMARY.specialPermissions
    )

    const directPermissionEmails = Object.entries(legalDemoDirectPermissions)
      .filter(([, names]) => names.length > 0)
      .map(([userKey]) => legalDemoUsers[userKey as keyof typeof legalDemoUsers].email)
    assert.equal(
      await client
        .from('user_permissions as user_permissions')
        .innerJoin('users as users', 'users.id', 'user_permissions.user_id')
        .innerJoin('permissions as permissions', 'permissions.id', 'user_permissions.permission_id')
        .whereIn('users.email', directPermissionEmails)
        .whereIn('permissions.name', Object.values(legalDemoDirectPermissions).flat())
        .count('* as total')
        .first()
        .then((row) => Number(row?.total ?? 0)),
      EXPECTED_SUMMARY.userPermissions
    )

    const legalUserRows = await client
      .from('users')
      .whereIn(
        'email',
        legalDemoTokenUsers.map((key) => legalDemoUsers[key].email)
      )
      .select('id', 'email')
    const legalTokenUserIds = legalUserRows.map((user) => Number(user.id))
    assert.equal(
      await client
        .from('auth_access_tokens')
        .whereLike('name', `${LEGAL_DEMO_SEED_KEY}:%`)
        .count('* as total')
        .first()
        .then((row) => Number(row?.total ?? 0)),
      EXPECTED_SUMMARY.authTokens
    )
    assert.equal(
      await client
        .from('refresh_tokens')
        .where('tenant_id', tenantId)
        .whereIn('user_id', legalTokenUserIds)
        .count('* as total')
        .first()
        .then((row) => Number(row?.total ?? 0)),
      EXPECTED_SUMMARY.sessionRefreshTokens
    )

    const accessUserRows = await client
      .from('users')
      .whereIn(
        'email',
        Object.values(legalDemoUsers).map((user) => user.email)
      )
      .select('id', 'email')
    const accessUserIds = Object.fromEntries(
      Object.entries(legalDemoUsers).map(([key, fixture]) => [
        key,
        Number(accessUserRows.find((user) => user.email === fixture.email)?.id),
      ])
    )
    assert.equal(
      await client
        .from('rate_limits')
        .whereIn('key', resolvedRateLimitKeys(accessUserIds))
        .count('* as total')
        .first()
        .then((row) => Number(row?.total ?? 0)),
      EXPECTED_SUMMARY.rateLimits
    )
  })

  test('is idempotent, deterministic and reconciles stale built-in roles', async ({ assert }) => {
    const client = db.connection()
    const firstRun = await seedLegalDemo(client)
    const countsAfterFirstRun = await snapshotRowCounts(client)
    const tokenBefore = await client
      .from('auth_access_tokens')
      .where('name', `${LEGAL_DEMO_SEED_KEY}:andre:auth_token`)
      .select('hash', 'last_used_at', 'expires_at')
      .firstOrFail()

    const testUser = await User.findByOrFail('email', legalDemoUsers.test.email, { client })
    const guestRole = await client.from('roles').where('slug', 'guest').select('id').firstOrFail()
    await client
      .table('user_roles')
      .insert({ user_id: testUser.id, role_id: guestRole.id })
      .onConflict(['user_id', 'role_id'])
      .ignore()

    const secondRun = await seedLegalDemo(client)
    assert.deepEqual(secondRun, firstRun)
    assert.deepEqual(await snapshotRowCounts(client), countsAfterFirstRun)

    const tokenAfter = await client
      .from('auth_access_tokens')
      .where('name', `${LEGAL_DEMO_SEED_KEY}:andre:auth_token`)
      .select('hash', 'last_used_at', 'expires_at')
      .firstOrFail()
    assert.deepEqual(tokenAfter, tokenBefore)

    const testRoles = await client
      .from('roles')
      .innerJoin('user_roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', testUser.id)
      .orderBy('roles.slug')
      .select('roles.slug')
    assert.deepEqual(
      testRoles.map((role) => role.slug),
      ['user']
    )
  })

  test('keeps access, tenant boundaries and legal identifiers valid', async ({ assert }) => {
    const client = db.connection()
    const { tenantId } = await seedLegalDemo(client)
    const admin = await User.findByOrFail('email', legalDemoUsers.admin.email, { client })

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
      if (process.cnj_number) assert.isTrue(isValidCnj(process.cnj_number))
    }

    const partyGroups = await client
      .from('process_parties')
      .where('tenant_id', tenantId)
      .where('is_primary', true)
      .groupBy('process_id')
      .select('process_id')
      .count('* as total')
      .countDistinct('side as side_total')
    assert.isAtLeast(partyGroups.length, EXPECTED_SUMMARY.processes)
    for (const partyGroup of partyGroups) {
      assert.equal(Number(partyGroup.total), 2)
      assert.equal(Number(partyGroup.side_total), 2)
    }

    const documents = await client
      .from('files')
      .where('tenant_id', tenantId)
      .whereLike('file_name', 'demo/%')
      .select('file_name', 'file_type', 'storage_disk')
    assert.isTrue(
      documents.every(
        (document) => document.file_type === 'text/markdown' && document.storage_disk === 'fs'
      )
    )
  })
})
