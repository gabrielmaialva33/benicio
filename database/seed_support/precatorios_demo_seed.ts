import { stat } from 'node:fs/promises'

import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'

import { LEGAL_DEMO_REFERENCE_DATE } from '#database/fixtures/legal_demo'
import {
  PRECATORIOS_DEMO_SEED_KEY,
  precatoriosDemoCases,
  type PrecatoriosDemoUserKey,
  precatoriosDemoUsers,
  precatoriosDocumentTemplates,
  precatoriosPublicEntities,
  type PrecatoriosPublicEntityKey,
} from '#database/fixtures/precatorios_demo'
import { type DemoAccessContext, seedDemoAccess } from '#database/seed_support/demo_access'
import { withinSeedTransaction } from '#database/seed_support/transaction'
import Activity from '#modules/activities/models/activity'
import Client from '#modules/clients/models/client'
import Deadline from '#modules/deadlines/models/deadline'
import LegalDocument from '#modules/documents/models/legal_document'
import File from '#modules/files/models/file'
import Folder from '#modules/folders/models/folder'
import Hearing from '#modules/hearings/models/hearing'
import ProcessMovement from '#modules/movements/models/process_movement'
import LegalProcess from '#modules/processes/models/process'
import ProcessParty from '#modules/processes/models/process_party'
import Task from '#modules/tasks/models/task'

const DOCUMENT_URL_PREFIX = '/yol/demo-documents'

export interface PrecatoriosDemoSeedSummary {
  tenantId: number
  users: number
  clients: number
  folders: number
  processes: number
  parties: number
  files: number
  documents: number
  movements: number
  activities: number
  tasks: number
  hearings: number
  attendees: number
  deadlines: number
}

type PrecatoriosAccessContext = DemoAccessContext<PrecatoriosDemoUserKey>

function demoDate(value: string): DateTime {
  const date = DateTime.fromISO(value, { setZone: true })
  if (!date.isValid) throw new Error(`Invalid precatorios demo date: ${value}`)
  return date
}

function seededMetadata(metadata: Record<string, unknown> = {}) {
  return { ...metadata, seed_key: PRECATORIOS_DEMO_SEED_KEY, synthetic: true }
}

function observationFor(fixture: (typeof precatoriosDemoCases)[number]): string {
  const details = [`Status de origem: ${fixture.source_status}.`]
  if (fixture.priority) details.push('Prioridade constitucional sinalizada.')
  if (fixture.beneficiary_age && fixture.beneficiary_age >= 60) {
    details.push(`Beneficiário demonstrativo idoso (${fixture.beneficiary_age} anos).`)
  }
  if (fixture.serious_illness) details.push('Doença grave sinalizada na fixture sintética.')
  details.push(`Última atualização demonstrativa: ${fixture.update_date}.`)
  return details.join(' ')
}

async function seedClients(
  client: QueryClientContract,
  tenantId: number
): Promise<Record<PrecatoriosPublicEntityKey, number>> {
  const ids = {} as Record<PrecatoriosPublicEntityKey, number>

  for (const [key, fixture] of Object.entries(precatoriosPublicEntities) as Array<
    [PrecatoriosPublicEntityKey, (typeof precatoriosPublicEntities)[PrecatoriosPublicEntityKey]]
  >) {
    const entity = await Client.updateOrCreate(
      { tenant_id: tenantId, document: fixture.document },
      {
        tenant_id: tenantId,
        name: fixture.name,
        document: fixture.document,
        person_type: 'company',
        email: fixture.email,
        phone: fixture.phone,
        address: fixture.address,
        notes: fixture.notes,
        metadata: seededMetadata(fixture.metadata),
        deletedAt: null,
      },
      { client }
    )
    ids[key] = entity.id
  }

  return ids
}

async function seedFoldersAndProcesses(
  client: QueryClientContract,
  access: PrecatoriosAccessContext,
  clientIds: Record<PrecatoriosPublicEntityKey, number>
) {
  const folderIds: Record<string, number> = {}
  const processIds: Record<string, number> = {}

  for (const fixture of precatoriosDemoCases) {
    const entity = precatoriosPublicEntities[fixture.entity]
    const folder = await Folder.updateOrCreate(
      { tenant_id: access.tenantId, code: fixture.code },
      {
        tenant_id: access.tenantId,
        code: fixture.code,
        title: `Precatório ${fixture.nature} - ${fixture.beneficiary}`,
        description: `Cenário ${fixture.code}; processo originário demonstrativo ${fixture.legacy_number}.`,
        status: fixture.folder_status,
        area: fixture.nature.includes('Trabalhista') ? 'Trabalhista' : 'Administrativo',
        subarea: 'Precatórios',
        client_id: clientIds[fixture.entity],
        responsible_lawyer_id: access.userIds[fixture.responsible],
        metadata: seededMetadata({
          matter_type: 'precatorio',
          chronological_order: fixture.chronological_order,
          budget_year: fixture.budget_year,
          priority: fixture.priority,
          beneficiary_age: fixture.beneficiary_age,
          serious_illness: fixture.serious_illness,
          beneficiary_document: fixture.beneficiary_document,
          last_update: fixture.update_date,
        }),
        deletedAt: null,
      },
      { client }
    )
    folderIds[fixture.code] = folder.id

    const process = await LegalProcess.updateOrCreate(
      { tenant_id: access.tenantId, internal_code: fixture.code },
      {
        tenant_id: access.tenantId,
        folder_id: folder.id,
        cnj_number: null,
        legacy_number: fixture.legacy_number,
        internal_code: fixture.code,
        status: 'active',
        instance: 'superior',
        phase: 'execution',
        distribution_type: 'lottery',
        electronic: true,
        is_primary: true,
        nature: fixture.nature,
        action_type: 'Execução contra a Fazenda Pública',
        tribunal: fixture.tribunal,
        judicial_body: fixture.judicial_body,
        district: fixture.district,
        forum: null,
        court_division: null,
        judge: 'Presidência do Tribunal - cenário demonstrativo',
        case_value: fixture.principal_value,
        conviction_value: fixture.updated_value,
        costs: null,
        fees: null,
        distribution_date: demoDate(fixture.request_date),
        citation_date: null,
        entry_date: demoDate(fixture.request_date),
        observation: observationFor(fixture),
        object_detail: `Pagamento de precatório ${fixture.nature.toLowerCase()}, ordem ${fixture.chronological_order}, orçamento ${fixture.budget_year}.`,
        metadata: seededMetadata({ source_status: fixture.source_status }),
        deletedAt: null,
      },
      { client }
    )
    processIds[fixture.code] = process.id

    await ProcessParty.updateOrCreate(
      {
        tenant_id: access.tenantId,
        process_id: process.id,
        side: 'active',
        name: fixture.beneficiary,
      },
      {
        tenant_id: access.tenantId,
        process_id: process.id,
        side: 'active',
        role: 'Beneficiário',
        is_primary: true,
        name: fixture.beneficiary,
        document: fixture.beneficiary_document,
        person_type: fixture.beneficiary_person_type,
        metadata: seededMetadata({ represented_client: false }),
      },
      { client }
    )
    await ProcessParty.updateOrCreate(
      {
        tenant_id: access.tenantId,
        process_id: process.id,
        side: 'passive',
        name: entity.name,
      },
      {
        tenant_id: access.tenantId,
        process_id: process.id,
        side: 'passive',
        role: 'Ente devedor',
        is_primary: true,
        name: entity.name,
        document: entity.document,
        person_type: 'company',
        metadata: seededMetadata({
          represented_client: true,
          client_id: clientIds[fixture.entity],
        }),
      },
      { client }
    )
  }

  return { folderIds, processIds }
}

async function seedDocuments(
  client: QueryClientContract,
  access: PrecatoriosAccessContext,
  folderIds: Record<string, number>,
  processIds: Record<string, number>
): Promise<number> {
  const assets = new Map<string, number>()
  for (const template of precatoriosDocumentTemplates) {
    const asset = await stat(app.publicPath(`yol/demo-documents/${template.file_name}`))
    assets.set(template.file_name, asset.size)
  }

  for (const fixture of precatoriosDemoCases) {
    for (const template of precatoriosDocumentTemplates) {
      const storedName = `demo/precatorios/${fixture.code}/${template.file_name}`
      const file = await File.updateOrCreate(
        { tenant_id: access.tenantId, file_name: storedName },
        {
          tenant_id: access.tenantId,
          owner_id:
            template.key === 'calculation' ? access.userIds.manager : access.userIds.assistant,
          client_name: `${fixture.code} - ${template.title}`,
          file_name: storedName,
          file_size: assets.get(template.file_name)!,
          file_type: 'text/markdown',
          file_category: 'document',
          url: `${DOCUMENT_URL_PREFIX}/${template.file_name}`,
        },
        { client }
      )

      await LegalDocument.updateOrCreate(
        { tenant_id: access.tenantId, file_id: file.id },
        {
          tenant_id: access.tenantId,
          folder_id: folderIds[fixture.code],
          process_id: processIds[fixture.code],
          file_id: file.id,
          created_by:
            template.key === 'calculation' ? access.userIds.manager : access.userIds.assistant,
          document_type: template.document_type,
          title: template.title,
          description: template.description,
          version: template.version,
          is_signed: template.is_signed,
          metadata: seededMetadata({ precatorio_code: fixture.code, template: template.key }),
          deletedAt: null,
        },
        { client }
      )
    }
  }
  return precatoriosDemoCases.length * precatoriosDocumentTemplates.length
}

async function seedMovementsAndActivities(
  client: QueryClientContract,
  access: PrecatoriosAccessContext,
  folderIds: Record<string, number>,
  processIds: Record<string, number>
): Promise<{ movements: number; activities: number }> {
  let movements = 0
  let activities = 0

  for (const fixture of precatoriosDemoCases) {
    await Activity.firstOrCreate(
      {
        tenant_id: access.tenantId,
        folder_id: folderIds[fixture.code],
        event_type: 'demo.precatorio.seeded',
        summary: `Precatório ${fixture.code} carregado no cenário demonstrativo`,
      },
      {
        process_id: processIds[fixture.code],
        actor_id: access.userIds[fixture.responsible],
        data: seededMetadata({ precatorio_code: fixture.code }),
        occurred_at: demoDate(fixture.request_date),
      },
      { client }
    )
    activities++

    for (const [index, movementFixture] of fixture.movements.entries()) {
      const externalId = `${PRECATORIOS_DEMO_SEED_KEY}:${fixture.code}:${index + 1}`
      const movement = await ProcessMovement.updateOrCreate(
        { tenant_id: access.tenantId, source: 'import', external_id: externalId },
        {
          tenant_id: access.tenantId,
          process_id: processIds[fixture.code],
          created_by: index === 0 ? access.userIds.assistant : access.userIds.manager,
          occurred_at: demoDate(movementFixture.occurred_at),
          kind: index === 0 ? 'autuação' : 'atualização',
          title: movementFixture.title,
          description: `${movementFixture.title} no cenário demonstrativo ${fixture.code}.`,
          source: 'import',
          external_id: externalId,
          metadata: seededMetadata({ precatorio_code: fixture.code }),
          deletedAt: null,
        },
        { client }
      )
      movements++

      await Activity.firstOrCreate(
        {
          tenant_id: access.tenantId,
          folder_id: folderIds[fixture.code],
          event_type: 'process.movement.imported',
          summary: movementFixture.title,
        },
        {
          process_id: processIds[fixture.code],
          actor_id: movement.created_by,
          data: seededMetadata({ movement_id: movement.id }),
          occurred_at: movement.occurred_at,
        },
        { client }
      )
      activities++
    }
  }

  return { movements, activities }
}

async function seedTasksDeadlinesAndHearings(
  client: QueryClientContract,
  access: PrecatoriosAccessContext,
  folderIds: Record<string, number>,
  processIds: Record<string, number>
): Promise<{ tasks: number; deadlines: number; hearings: number; attendees: number }> {
  const reference = demoDate(LEGAL_DEMO_REFERENCE_DATE)
  let tasks = 0
  let deadlines = 0
  let hearings = 0
  let attendees = 0

  for (const [index, fixture] of precatoriosDemoCases.entries()) {
    const dueAt = DateTime.fromObject(
      { year: fixture.budget_year, month: 12, day: 20, hour: 17 },
      { zone: 'America/Sao_Paulo' }
    )
    await Task.updateOrCreate(
      {
        tenant_id: access.tenantId,
        folder_id: folderIds[fixture.code],
        title: `Acompanhar pagamento - ${fixture.code}`,
      },
      {
        tenant_id: access.tenantId,
        folder_id: folderIds[fixture.code],
        process_id: processIds[fixture.code],
        assignee_id: access.userIds.manager,
        creator_id: access.userIds.lawyer,
        title: `Acompanhar pagamento - ${fixture.code}`,
        description: `Verificar orçamento ${fixture.budget_year} e cronograma de pagamento.`,
        status: 'pending',
        priority: fixture.priority ? 'high' : 'medium',
        due_date: dueAt,
        completed_at: null,
        tags: ['precatorio', 'pagamento'],
        metadata: seededMetadata({ budget_year: fixture.budget_year }),
        deletedAt: null,
      },
      { client }
    )
    tasks++

    if (fixture.priority) {
      await Task.updateOrCreate(
        {
          tenant_id: access.tenantId,
          folder_id: folderIds[fixture.code],
          title: `Verificar documentação de prioridade - ${fixture.code}`,
        },
        {
          tenant_id: access.tenantId,
          folder_id: folderIds[fixture.code],
          process_id: processIds[fixture.code],
          assignee_id: access.userIds.assistant,
          creator_id: access.userIds.manager,
          title: `Verificar documentação de prioridade - ${fixture.code}`,
          description: 'Confirmar documentação comprobatória da prioridade constitucional.',
          status: 'completed',
          priority: 'high',
          due_date: reference.minus({ days: 60 }),
          completed_at: reference.minus({ days: 59 }),
          tags: ['precatorio', 'prioridade'],
          metadata: seededMetadata({
            beneficiary_age: fixture.beneficiary_age,
            serious_illness: fixture.serious_illness,
          }),
          deletedAt: null,
        },
        { client }
      )
      tasks++
    }

    await Deadline.updateOrCreate(
      {
        tenant_id: access.tenantId,
        folder_id: folderIds[fixture.code],
        title: `Previsão orçamentária - ${fixture.code}`,
      },
      {
        tenant_id: access.tenantId,
        folder_id: folderIds[fixture.code],
        process_id: processIds[fixture.code],
        assignee_id: access.userIds.manager,
        creator_id: access.userIds.lawyer,
        title: `Previsão orçamentária - ${fixture.code}`,
        description: `Acompanhar pagamento previsto para o orçamento ${fixture.budget_year}.`,
        kind: 'administrative',
        status: 'pending',
        priority: fixture.priority ? 'high' : 'medium',
        is_fatal: false,
        due_at: dueAt,
        completed_at: null,
        legal_basis: 'Art. 100 da Constituição Federal - cenário demonstrativo',
        notes: null,
        metadata: seededMetadata({ chronological_order: fixture.chronological_order }),
        deletedAt: null,
      },
      { client }
    )
    deadlines++

    if (index % 2 === 0) {
      const startsAt = reference.plus({ days: 45 + index })
      const hearing = await Hearing.updateOrCreate(
        {
          tenant_id: access.tenantId,
          process_id: processIds[fixture.code],
          title: `Conciliação de precatório - ${fixture.code}`,
        },
        {
          tenant_id: access.tenantId,
          process_id: processIds[fixture.code],
          creator_id: access.userIds.manager,
          title: `Conciliação de precatório - ${fixture.code}`,
          description: 'Audiência demonstrativa para proposta de acordo direto.',
          type: 'conciliation',
          status: 'scheduled',
          starts_at: startsAt,
          ends_at: startsAt.plus({ hours: 1 }),
          completed_at: null,
          location: `${fixture.tribunal} - Câmara de Conciliação`,
          online_url: null,
          judge: null,
          notes: 'Proposta sintética com deságio de 40% para pagamento à vista.',
          result: null,
          metadata: seededMetadata({
            proposed_value: Number(fixture.updated_value) * 0.6,
            discount_percentage: 40,
          }),
          deletedAt: null,
        },
        { client }
      )
      hearings++

      for (const [user, role] of [
        ['manager', 'Gestor responsável'],
        ['lawyer', 'Advogado especialista'],
      ] as const) {
        await client
          .table('hearing_attendees')
          .insert({
            tenant_id: access.tenantId,
            hearing_id: hearing.id,
            user_id: access.userIds[user],
            role,
            is_required: true,
          })
          .onConflict(['hearing_id', 'user_id'])
          .merge({ tenant_id: access.tenantId, role, is_required: true })
        attendees++
      }
    }
  }

  return { tasks, deadlines, hearings, attendees }
}

export function seedPrecatoriosDemo(
  client: QueryClientContract
): Promise<PrecatoriosDemoSeedSummary> {
  return withinSeedTransaction(client, async (trx) => {
    const access = await seedDemoAccess(trx, precatoriosDemoUsers)
    const clientIds = await seedClients(trx, access.tenantId)
    const { folderIds, processIds } = await seedFoldersAndProcesses(trx, access, clientIds)
    const documents = await seedDocuments(trx, access, folderIds, processIds)
    const timeline = await seedMovementsAndActivities(trx, access, folderIds, processIds)
    const operations = await seedTasksDeadlinesAndHearings(trx, access, folderIds, processIds)

    return {
      tenantId: access.tenantId,
      users: Object.keys(access.userIds).length,
      clients: Object.keys(clientIds).length,
      folders: Object.keys(folderIds).length,
      processes: Object.keys(processIds).length,
      parties: precatoriosDemoCases.length * 2,
      files: documents,
      documents,
      ...timeline,
      ...operations,
    }
  })
}
