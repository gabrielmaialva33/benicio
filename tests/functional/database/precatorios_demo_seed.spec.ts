import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'
import { test } from '@japa/runner'

import { LEGACY_PRECATORIOS_PARITY } from '#database/fixtures/legacy_parity'
import {
  PRECATORIOS_DEMO_SEED_KEY,
  precatoriosDemoCases,
  precatoriosDemoUsers,
  precatoriosDocumentTemplates,
  precatoriosPublicEntities,
} from '#database/fixtures/precatorios_demo'
import {
  seedPrecatoriosDemo,
  type PrecatoriosDemoSeedSummary,
} from '#database/seed_support/precatorios_demo_seed'

const EXPECTED_SUMMARY = {
  users: 3,
  clients: 6,
  folders: 6,
  processes: 6,
  parties: 12,
  files: 18,
  documents: 18,
  movements: 12,
  activities: 18,
  tasks: 9,
  hearings: 3,
  attendees: 6,
  deadlines: 6,
} satisfies Omit<PrecatoriosDemoSeedSummary, 'tenantId'>

const MANAGED_TABLES = [
  'users',
  'user_tenants',
  'user_roles',
  'clients',
  'folders',
  'processes',
  'process_parties',
  'files',
  'legal_documents',
  'process_movements',
  'activities',
  'tasks',
  'deadlines',
  'hearings',
  'hearing_attendees',
] as const

async function snapshotRowCounts(client: QueryClientContract): Promise<Record<string, number>> {
  return Object.fromEntries(
    await Promise.all(
      MANAGED_TABLES.map(async (table) => {
        const row = await client.from(table).count('* as total').first()
        return [table, Number(row?.total ?? 0)] as const
      })
    )
  )
}

test.group('Precatórios demo database seed', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('preserves every precatórios legacy category and adds canonical relations', async ({
    assert,
  }) => {
    const client = db.connection()
    assert.isTrue(client.isTransaction)

    const summary = await seedPrecatoriosDemo(client)
    const { tenantId, ...counts } = summary
    assert.deepEqual(counts, EXPECTED_SUMMARY)

    const parityActual: Record<keyof typeof LEGACY_PRECATORIOS_PARITY, number> = {
      users: summary.users,
      publicEntityClients: summary.clients,
      folders: summary.folders,
      processes: summary.processes,
      documents: summary.documents,
      movements: summary.movements,
      tasks: summary.tasks,
      hearings: summary.hearings,
    }
    for (const [category, minimum] of Object.entries(LEGACY_PRECATORIOS_PARITY)) {
      assert.isAtLeast(parityActual[category as keyof typeof parityActual], minimum, category)
    }

    const processes = await client
      .from('processes')
      .where('tenant_id', tenantId)
      .whereIn(
        'internal_code',
        precatoriosDemoCases.map((fixture) => fixture.code)
      )
      .select('id', 'folder_id', 'cnj_number', 'legacy_number', 'internal_code', 'metadata')
    assert.lengthOf(processes, EXPECTED_SUMMARY.processes)

    for (const fixture of precatoriosDemoCases) {
      const process = processes.find((row) => row.internal_code === fixture.code)
      assert.isDefined(process, fixture.code)
      assert.isNull(process!.cnj_number, fixture.code)
      assert.equal(process!.legacy_number, fixture.legacy_number, fixture.code)
    }

    const processIds = processes.map((process) => Number(process.id))
    const partyGroups = await client
      .from('process_parties')
      .where('tenant_id', tenantId)
      .whereIn('process_id', processIds)
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

    const documentsPerProcess = await client
      .from('legal_documents')
      .where('tenant_id', tenantId)
      .whereIn('process_id', processIds)
      .groupBy('process_id')
      .select('process_id')
      .count('* as total')
    assert.lengthOf(documentsPerProcess, EXPECTED_SUMMARY.processes)
    for (const group of documentsPerProcess) {
      assert.equal(Number(group.total), precatoriosDocumentTemplates.length)
    }

    const documents = await client
      .from('files')
      .where('tenant_id', tenantId)
      .whereLike('file_name', 'demo/precatorios/%')
      .select('file_name', 'file_size', 'file_type', 'url')
    assert.lengthOf(documents, EXPECTED_SUMMARY.files)
    assert.isTrue(
      documents.every(
        (document) =>
          Number(document.file_size) > 0 &&
          document.file_type === 'text/markdown' &&
          document.url.startsWith('/yol/demo-documents/')
      )
    )

    const improvementCounts = {
      deadlines: await client
        .from('deadlines')
        .where('tenant_id', tenantId)
        .whereIn('process_id', processIds)
        .count('* as total')
        .first()
        .then((row) => Number(row?.total ?? 0)),
      attendees: await client
        .from('hearing_attendees as attendees')
        .innerJoin('hearings as hearings', 'hearings.id', 'attendees.hearing_id')
        .where('attendees.tenant_id', tenantId)
        .whereIn('hearings.process_id', processIds)
        .count('* as total')
        .first()
        .then((row) => Number(row?.total ?? 0)),
      activities: await client
        .from('activities')
        .where('tenant_id', tenantId)
        .whereIn('process_id', processIds)
        .count('* as total')
        .first()
        .then((row) => Number(row?.total ?? 0)),
    }
    assert.deepEqual(improvementCounts, {
      deadlines: EXPECTED_SUMMARY.deadlines,
      attendees: EXPECTED_SUMMARY.attendees,
      activities: EXPECTED_SUMMARY.activities,
    })
  })

  test('is idempotent and keeps all records inside the shared tenant', async ({ assert }) => {
    const client = db.connection()
    const firstRun = await seedPrecatoriosDemo(client)
    const countsAfterFirstRun = await snapshotRowCounts(client)
    const secondRun = await seedPrecatoriosDemo(client)

    assert.deepEqual(secondRun, firstRun)
    assert.deepEqual(await snapshotRowCounts(client), countsAfterFirstRun)

    const processCodes = precatoriosDemoCases.map((fixture) => fixture.code)
    const tenantMismatches = [
      await client
        .from('folders as folders')
        .innerJoin('clients as clients', 'clients.id', 'folders.client_id')
        .whereIn('folders.code', processCodes)
        .whereRaw('folders.tenant_id <> clients.tenant_id')
        .count('* as total')
        .first(),
      await client
        .from('processes as processes')
        .innerJoin('folders as folders', 'folders.id', 'processes.folder_id')
        .whereIn('processes.internal_code', processCodes)
        .whereRaw('processes.tenant_id <> folders.tenant_id')
        .count('* as total')
        .first(),
      await client
        .from('process_parties as parties')
        .innerJoin('processes as processes', 'processes.id', 'parties.process_id')
        .whereIn('processes.internal_code', processCodes)
        .whereRaw('parties.tenant_id <> processes.tenant_id')
        .count('* as total')
        .first(),
    ]
    assert.deepEqual(
      tenantMismatches.map((row) => Number(row?.total ?? 0)),
      [0, 0, 0]
    )

    const publicEntityDocuments = Object.values(precatoriosPublicEntities).map(
      (entity) => entity.document
    )
    assert.equal(new Set(publicEntityDocuments).size, EXPECTED_SUMMARY.clients)
    assert.isTrue(publicEntityDocuments.every((document) => /^\d{14}$/.test(document)))

    const users = await client
      .from('users')
      .whereIn('email', Object.values(precatoriosDemoUsers).map((user) => user.email))
      .select('id')
    assert.lengthOf(users, EXPECTED_SUMMARY.users)

    const movements = await client
      .from('process_movements')
      .whereLike('external_id', `${PRECATORIOS_DEMO_SEED_KEY}:%`)
      .count('* as total')
      .first()
    assert.equal(Number(movements?.total ?? 0), EXPECTED_SUMMARY.movements)
  })
})
