import { stat } from 'node:fs/promises'

import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'

import {
  LEGAL_DEMO_REFERENCE_DATE,
  LEGAL_DEMO_SEED_KEY,
  legalDemoClients,
  legalDemoDeadlines,
  legalDemoDocuments,
  legalDemoFavorites,
  legalDemoFolders,
  legalDemoHearings,
  legalDemoMessages,
  legalDemoMovements,
  legalDemoNotifications,
  legalDemoProcesses,
  legalDemoTasks,
  type LegalDemoClientKey,
  type LegalDemoFolderKey,
  type LegalDemoProcessKey,
} from '#database/fixtures/legal_demo'
import {
  seedLegalDemoAccess,
  type LegalDemoAccessContext,
} from '#database/seed_support/demo_access'
import { withinSeedTransaction } from '#database/seed_support/transaction'
import Activity from '#modules/activities/models/activity'
import AuditLog from '#modules/audits/models/audit_log'
import Client from '#modules/clients/models/client'
import Deadline from '#modules/deadlines/models/deadline'
import LegalDocument from '#modules/documents/models/legal_document'
import File from '#modules/files/models/file'
import FolderFavorite from '#modules/favorites/models/folder_favorite'
import Folder from '#modules/folders/models/folder'
import Hearing from '#modules/hearings/models/hearing'
import Message from '#modules/messages/models/message'
import ProcessMovement from '#modules/movements/models/process_movement'
import Notification from '#modules/notifications/models/notification'
import { isValidCnj } from '#modules/processes/domain/cnj'
import LegalProcess from '#modules/processes/models/process'
import ProcessParty from '#modules/processes/models/process_party'
import Task from '#modules/tasks/models/task'

const DEMO_DOCUMENT_URL_PREFIX = '/yol/demo-documents'

export interface LegalDemoSeedSummary {
  tenantId: number
  users: number
  clients: number
  folders: number
  processes: number
  parties: number
  tasks: number
  hearings: number
  deadlines: number
  movements: number
  activities: number
  documents: number
  messages: number
  notifications: number
  favorites: number
  auditLogs: number
}

function seededMetadata(metadata: Record<string, unknown> = {}) {
  return { ...metadata, seed_key: LEGAL_DEMO_SEED_KEY }
}

function demoDate(value: string): DateTime {
  const date = DateTime.fromISO(value, { setZone: true })
  if (!date.isValid) {
    throw new Error(`Invalid legal demo date "${value}": ${date.invalidExplanation}`)
  }
  return date
}

function assertFixtureContracts() {
  const clientDocuments = new Set<string>()
  const folderCodes = new Set<string>()
  const processCodes = new Set<string>()

  for (const client of Object.values(legalDemoClients)) {
    const expected = client.person_type === 'individual' ? /^\d{11}$/ : /^[A-Z0-9]{12}\d{2}$/
    if (!expected.test(client.document)) {
      throw new Error(
        `Legal demo client document does not match ${client.person_type}: ${client.name}`
      )
    }
    if (clientDocuments.has(client.document)) {
      throw new Error(`Duplicate legal demo client document: ${client.document}`)
    }
    clientDocuments.add(client.document)
  }

  for (const folder of Object.values(legalDemoFolders)) {
    if (folder.code !== folder.code.trim().toUpperCase()) {
      throw new Error(`Legal demo folder code is not normalized: ${folder.code}`)
    }
    if (folderCodes.has(folder.code)) {
      throw new Error(`Duplicate legal demo folder code: ${folder.code}`)
    }
    folderCodes.add(folder.code)
  }

  for (const process of Object.values(legalDemoProcesses)) {
    if (process.cnj_number && !isValidCnj(process.cnj_number)) {
      throw new Error(`Invalid CNJ in legal demo process ${process.internal_code}`)
    }
    const identifiers: Array<string | null> = [
      process.cnj_number,
      process.legacy_number,
      process.internal_code,
    ]
    if (!identifiers.some(Boolean)) {
      throw new Error('Legal demo process has no identifier')
    }
    if (processCodes.has(process.internal_code)) {
      throw new Error(`Duplicate legal demo process code: ${process.internal_code}`)
    }
    processCodes.add(process.internal_code)
  }
}

async function seedClientsAndFolders(client: QueryClientContract, access: LegalDemoAccessContext) {
  const clientIds = {} as Record<LegalDemoClientKey, number>
  const folderIds = {} as Record<LegalDemoFolderKey, number>

  for (const [key, fixture] of Object.entries(legalDemoClients) as Array<
    [LegalDemoClientKey, (typeof legalDemoClients)[LegalDemoClientKey]]
  >) {
    const legalClient = await Client.updateOrCreate(
      { tenant_id: access.tenantId, document: fixture.document },
      {
        tenant_id: access.tenantId,
        name: fixture.name,
        document: fixture.document,
        person_type: fixture.person_type,
        email: fixture.email,
        phone: fixture.phone,
        address: fixture.address,
        notes: fixture.notes,
        metadata: seededMetadata(fixture.metadata),
        deletedAt: null,
      },
      { client }
    )
    clientIds[key] = legalClient.id
  }

  for (const [key, fixture] of Object.entries(legalDemoFolders) as Array<
    [LegalDemoFolderKey, (typeof legalDemoFolders)[LegalDemoFolderKey]]
  >) {
    const folder = await Folder.updateOrCreate(
      { tenant_id: access.tenantId, code: fixture.code },
      {
        tenant_id: access.tenantId,
        code: fixture.code,
        title: fixture.title,
        description: fixture.description,
        status: fixture.status,
        area: fixture.area,
        subarea: fixture.subarea,
        client_id: clientIds[fixture.client],
        responsible_lawyer_id: access.userIds[fixture.responsible],
        metadata: seededMetadata(fixture.metadata),
        deletedAt: null,
      },
      { client }
    )
    folderIds[key] = folder.id
  }

  return { clientIds, folderIds }
}

async function seedProcesses(
  client: QueryClientContract,
  access: LegalDemoAccessContext,
  clientIds: Record<LegalDemoClientKey, number>,
  folderIds: Record<LegalDemoFolderKey, number>
) {
  const processIds = {} as Record<LegalDemoProcessKey, number>
  let parties = 0

  for (const [key, fixture] of Object.entries(legalDemoProcesses) as Array<
    [LegalDemoProcessKey, (typeof legalDemoProcesses)[LegalDemoProcessKey]]
  >) {
    const folderFixture = legalDemoFolders[fixture.folder]
    const representedClient = legalDemoClients[folderFixture.client]
    const process = await LegalProcess.updateOrCreate(
      { tenant_id: access.tenantId, internal_code: fixture.internal_code },
      {
        tenant_id: access.tenantId,
        folder_id: folderIds[fixture.folder],
        cnj_number: fixture.cnj_number,
        legacy_number: fixture.legacy_number,
        internal_code: fixture.internal_code,
        status: fixture.status,
        instance: fixture.instance,
        phase: fixture.phase,
        distribution_type: fixture.distribution_type,
        electronic: fixture.electronic,
        is_primary: true,
        nature: fixture.nature,
        action_type: fixture.action_type,
        tribunal: fixture.tribunal,
        judicial_body: fixture.judicial_body,
        district: fixture.district,
        forum: null,
        court_division: fixture.court_division,
        judge: fixture.judge,
        case_value: fixture.case_value,
        conviction_value: fixture.conviction_value,
        costs: fixture.costs,
        fees: fixture.fees,
        distribution_date: demoDate(fixture.distribution_date),
        citation_date: fixture.citation_date ? demoDate(fixture.citation_date) : null,
        entry_date: demoDate(fixture.entry_date),
        observation: fixture.observation,
        object_detail: fixture.object_detail,
        metadata: seededMetadata(fixture.metadata),
        deletedAt: null,
      },
      { client }
    )
    processIds[key] = process.id

    await ProcessParty.updateOrCreate(
      {
        tenant_id: access.tenantId,
        process_id: process.id,
        side: fixture.clientSide,
        name: representedClient.name,
      },
      {
        tenant_id: access.tenantId,
        process_id: process.id,
        side: fixture.clientSide,
        role: fixture.clientRole,
        is_primary: true,
        name: representedClient.name,
        document: representedClient.document,
        person_type: representedClient.person_type,
        metadata: seededMetadata({
          represented_client: true,
          client_id: clientIds[folderFixture.client],
        }),
      },
      { client }
    )

    await ProcessParty.updateOrCreate(
      {
        tenant_id: access.tenantId,
        process_id: process.id,
        side: fixture.counterparty.side,
        name: fixture.counterparty.name,
      },
      {
        tenant_id: access.tenantId,
        process_id: process.id,
        side: fixture.counterparty.side,
        role: fixture.counterparty.role,
        is_primary: true,
        name: fixture.counterparty.name,
        document: fixture.counterparty.document,
        person_type: fixture.counterparty.person_type,
        metadata: seededMetadata({ represented_client: false }),
      },
      { client }
    )
    parties += 2
  }

  return { processIds, parties }
}

async function seedOperationalData(
  client: QueryClientContract,
  access: LegalDemoAccessContext,
  folderIds: Record<LegalDemoFolderKey, number>,
  processIds: Record<LegalDemoProcessKey, number>
) {
  const reference = demoDate(LEGAL_DEMO_REFERENCE_DATE)

  for (const fixture of legalDemoTasks) {
    const completedAt =
      fixture.status === 'completed'
        ? reference.plus({ days: fixture.completedOffsetDays ?? fixture.dueOffsetDays })
        : null
    await Task.updateOrCreate(
      {
        tenant_id: access.tenantId,
        folder_id: folderIds[fixture.folder],
        title: fixture.title,
      },
      {
        tenant_id: access.tenantId,
        folder_id: folderIds[fixture.folder],
        process_id: processIds[fixture.process],
        assignee_id: access.userIds[fixture.assignee],
        creator_id: access.userIds[fixture.creator],
        title: fixture.title,
        description: fixture.description,
        status: fixture.status,
        priority: fixture.priority,
        due_date: reference.plus({ days: fixture.dueOffsetDays }),
        completed_at: completedAt,
        tags: fixture.tags,
        metadata: seededMetadata(fixture.metadata),
        deletedAt: null,
      },
      { client }
    )
  }

  for (const fixture of legalDemoHearings) {
    const startsAt = reference.plus({ days: fixture.startsOffsetDays })
    const hearing = await Hearing.updateOrCreate(
      {
        tenant_id: access.tenantId,
        process_id: processIds[fixture.process],
        title: fixture.title,
      },
      {
        tenant_id: access.tenantId,
        process_id: processIds[fixture.process],
        creator_id: access.userIds[fixture.creator],
        title: fixture.title,
        description: fixture.description,
        type: fixture.type,
        status: 'scheduled',
        starts_at: startsAt,
        ends_at: startsAt.plus({ minutes: fixture.durationMinutes }),
        completed_at: null,
        location: fixture.location,
        online_url: fixture.online_url,
        judge: fixture.judge,
        notes: fixture.notes,
        result: null,
        metadata: seededMetadata(fixture.metadata),
        deletedAt: null,
      },
      { client }
    )

    for (const attendee of fixture.attendees) {
      await client
        .table('hearing_attendees')
        .insert({
          tenant_id: access.tenantId,
          hearing_id: hearing.id,
          user_id: access.userIds[attendee.user],
          role: attendee.role,
          is_required: attendee.is_required,
        })
        .onConflict(['hearing_id', 'user_id'])
        .merge({
          tenant_id: access.tenantId,
          role: attendee.role,
          is_required: attendee.is_required,
        })
    }
  }

  for (const fixture of legalDemoDeadlines) {
    await Deadline.updateOrCreate(
      {
        tenant_id: access.tenantId,
        folder_id: folderIds[fixture.folder],
        title: fixture.title,
      },
      {
        tenant_id: access.tenantId,
        folder_id: folderIds[fixture.folder],
        process_id: processIds[fixture.process],
        assignee_id: access.userIds[fixture.assignee],
        creator_id: access.userIds[fixture.creator],
        title: fixture.title,
        description: fixture.description,
        kind: fixture.kind,
        status: 'pending',
        priority: fixture.priority,
        is_fatal: fixture.is_fatal,
        due_at: reference.plus({ days: fixture.dueOffsetDays }),
        completed_at: null,
        legal_basis: fixture.legal_basis,
        notes: null,
        metadata: seededMetadata(),
        deletedAt: null,
      },
      { client }
    )
  }
}

async function seedTimeline(
  client: QueryClientContract,
  access: LegalDemoAccessContext,
  folderIds: Record<LegalDemoFolderKey, number>,
  processIds: Record<LegalDemoProcessKey, number>
) {
  let activities = 0

  for (const [key, fixture] of Object.entries(legalDemoFolders) as Array<
    [LegalDemoFolderKey, (typeof legalDemoFolders)[LegalDemoFolderKey]]
  >) {
    const summary = `Pasta ${fixture.code} carregada no cenário demonstrativo`
    await Activity.firstOrCreate(
      {
        tenant_id: access.tenantId,
        folder_id: folderIds[key],
        event_type: 'demo.folder.seeded',
        summary,
      },
      {
        process_id: null,
        actor_id: access.userIds[fixture.responsible],
        data: seededMetadata({ folder_code: fixture.code }),
        occurred_at: demoDate(LEGAL_DEMO_REFERENCE_DATE).minus({ days: 30 }),
      },
      { client }
    )
    activities++
  }

  for (const fixture of legalDemoMovements) {
    const movement = await ProcessMovement.updateOrCreate(
      {
        tenant_id: access.tenantId,
        source: 'import',
        external_id: `${LEGAL_DEMO_SEED_KEY}:${fixture.key}`,
      },
      {
        tenant_id: access.tenantId,
        process_id: processIds[fixture.process],
        created_by: access.userIds[fixture.createdBy],
        occurred_at: demoDate(fixture.occurred_at),
        kind: fixture.kind,
        title: fixture.title,
        description: fixture.description,
        source: 'import',
        external_id: `${LEGAL_DEMO_SEED_KEY}:${fixture.key}`,
        metadata: seededMetadata(fixture.metadata),
        deletedAt: null,
      },
      { client }
    )
    const folderKey = legalDemoProcesses[fixture.process].folder
    await Activity.firstOrCreate(
      {
        tenant_id: access.tenantId,
        folder_id: folderIds[folderKey],
        event_type: 'process.movement.imported',
        summary: fixture.title,
      },
      {
        process_id: movement.process_id,
        actor_id: access.userIds[fixture.createdBy],
        data: seededMetadata({ movement_id: movement.id }),
        occurred_at: movement.occurred_at,
      },
      { client }
    )
    activities++
  }

  return activities
}

async function seedDocuments(
  client: QueryClientContract,
  access: LegalDemoAccessContext,
  folderIds: Record<LegalDemoFolderKey, number>,
  processIds: Record<LegalDemoProcessKey, number>
) {
  for (const fixture of legalDemoDocuments) {
    const assetPath = app.publicPath(`yol/demo-documents/${fixture.file_name}`)
    const asset = await stat(assetPath).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Missing legal demo document asset ${assetPath}: ${message}`)
    })
    const storedFileName = `demo/${fixture.file_name}`
    const file = await File.updateOrCreate(
      { tenant_id: access.tenantId, file_name: storedFileName },
      {
        tenant_id: access.tenantId,
        owner_id: access.userIds[fixture.owner],
        client_name: fixture.client_name,
        file_name: storedFileName,
        file_size: asset.size,
        file_type: 'text/markdown',
        file_category: 'document',
        url: `${DEMO_DOCUMENT_URL_PREFIX}/${fixture.file_name}`,
      },
      { client }
    )

    await LegalDocument.updateOrCreate(
      { tenant_id: access.tenantId, file_id: file.id },
      {
        tenant_id: access.tenantId,
        folder_id: folderIds[fixture.folder],
        process_id: processIds[fixture.process],
        file_id: file.id,
        created_by: access.userIds[fixture.owner],
        document_type: fixture.document_type,
        title: fixture.title,
        description: fixture.description,
        version: fixture.version,
        is_signed: fixture.is_signed,
        metadata: seededMetadata({ ...fixture.metadata, fixture_key: fixture.key }),
        deletedAt: null,
      },
      { client }
    )
  }
}

async function seedCommunications(
  client: QueryClientContract,
  access: LegalDemoAccessContext,
  folderIds: Record<LegalDemoFolderKey, number>
) {
  const reference = demoDate(LEGAL_DEMO_REFERENCE_DATE)

  for (const [index, fixture] of legalDemoMessages.entries()) {
    await Message.updateOrCreate(
      {
        tenant_id: access.tenantId,
        recipient_id: access.userIds[fixture.recipient],
        subject: fixture.subject,
      },
      {
        tenant_id: access.tenantId,
        recipient_id: access.userIds[fixture.recipient],
        sender_id: fixture.sender ? access.userIds[fixture.sender] : null,
        subject: fixture.subject,
        body: fixture.body,
        priority: fixture.priority,
        read_at: fixture.read ? reference.minus({ hours: index + 1 }) : null,
        metadata: seededMetadata({ folder_id: folderIds[fixture.folder] }),
        deletedAt: null,
      },
      { client }
    )
  }

  for (const [index, fixture] of legalDemoNotifications.entries()) {
    const folderId = fixture.folder ? folderIds[fixture.folder] : null
    await Notification.updateOrCreate(
      {
        tenant_id: access.tenantId,
        recipient_id: access.userIds[fixture.recipient],
        title: fixture.title,
      },
      {
        tenant_id: access.tenantId,
        recipient_id: access.userIds[fixture.recipient],
        actor_id: fixture.actor ? access.userIds[fixture.actor] : null,
        type: fixture.type,
        title: fixture.title,
        message: fixture.message,
        read_at: fixture.read ? reference.minus({ hours: index + 1 }) : null,
        data: seededMetadata(folderId ? { folder_id: folderId } : {}),
        action_url: folderId ? `/folders/${folderId}` : '/settings',
        action_text: fixture.action_text,
        deletedAt: null,
      },
      { client }
    )
  }
}

async function seedFavoritesAndAudits(
  client: QueryClientContract,
  access: LegalDemoAccessContext,
  folderIds: Record<LegalDemoFolderKey, number>
) {
  for (const fixture of legalDemoFavorites) {
    await FolderFavorite.firstOrCreate(
      {
        tenant_id: access.tenantId,
        user_id: access.userIds[fixture.user],
        folder_id: folderIds[fixture.folder],
      },
      {},
      { client }
    )
  }

  const auditFixtures = [
    {
      key: 'folder-create',
      user: 'andre' as const,
      resource: 'folders',
      action: 'create',
      folder: 'crypto' as const,
    },
    {
      key: 'process-update',
      user: 'marcos' as const,
      resource: 'processes',
      action: 'update',
      folder: 'zurichConflict' as const,
    },
    {
      key: 'document-create',
      user: 'patricia' as const,
      resource: 'documents',
      action: 'create',
      folder: 'caixaMortgage' as const,
    },
    {
      key: 'dashboard-read',
      user: 'admin' as const,
      resource: 'dashboard',
      action: 'read',
      folder: null,
    },
  ]

  for (const fixture of auditFixtures) {
    await AuditLog.updateOrCreate(
      { session_id: `${LEGAL_DEMO_SEED_KEY}:${fixture.key}` },
      {
        user_id: access.userIds[fixture.user],
        session_id: `${LEGAL_DEMO_SEED_KEY}:${fixture.key}`,
        ip_address: '127.0.0.1',
        user_agent: 'Benicio legal demo seeder',
        resource: fixture.resource,
        action: fixture.action,
        context: 'tenant',
        resource_id: fixture.folder ? folderIds[fixture.folder] : null,
        method: null,
        url: null,
        request_data: null,
        result: 'granted',
        reason: 'Deterministic development fixture',
        response_code: null,
        metadata: seededMetadata({ tenant_id: access.tenantId }),
      },
      { client }
    )
  }

  return auditFixtures.length
}

/** Ports the useful legacy scenario into the canonical tenant-aware contracts. */
export async function seedLegalDemo(client: QueryClientContract): Promise<LegalDemoSeedSummary> {
  assertFixtureContracts()
  const access = await seedLegalDemoAccess(client)

  return withinSeedTransaction(client, async (trx) => {
    const { clientIds, folderIds } = await seedClientsAndFolders(trx, access)
    const { processIds, parties } = await seedProcesses(trx, access, clientIds, folderIds)
    await seedOperationalData(trx, access, folderIds, processIds)
    const activities = await seedTimeline(trx, access, folderIds, processIds)
    await seedDocuments(trx, access, folderIds, processIds)
    await seedCommunications(trx, access, folderIds)
    const auditLogs = await seedFavoritesAndAudits(trx, access, folderIds)

    return {
      tenantId: access.tenantId,
      users: Object.keys(access.userIds).length,
      clients: Object.keys(clientIds).length,
      folders: Object.keys(folderIds).length,
      processes: Object.keys(processIds).length,
      parties,
      tasks: legalDemoTasks.length,
      hearings: legalDemoHearings.length,
      deadlines: legalDemoDeadlines.length,
      movements: legalDemoMovements.length,
      activities,
      documents: legalDemoDocuments.length,
      messages: legalDemoMessages.length,
      notifications: legalDemoNotifications.length,
      favorites: legalDemoFavorites.length,
      auditLogs,
    }
  })
}
