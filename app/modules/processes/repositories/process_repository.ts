import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import LegalProcess from '#modules/processes/models/process'
import ProcessParty from '#modules/processes/models/process_party'
import type {
  CreateProcessData,
  PreparedProcessPartyData,
  ProcessListOptions,
  UpdateProcessData,
} from '#modules/processes/interfaces/process_interface'

export default class ProcessRepository {
  async paginate(
    tenantId: number,
    options: ProcessListOptions
  ): Promise<ModelPaginatorContract<LegalProcess>> {
    const query = LegalProcess.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .whereIn(
        'folder_id',
        db.from('folders').select('id').where('tenant_id', tenantId).whereNull('deleted_at')
      )
      .preload('parties', (partyQuery) => {
        partyQuery.orderBy('side', 'asc').orderBy('is_primary', 'desc').orderBy('id', 'asc')
      })

    if (options.search) {
      const term = `%${options.search}%`
      const digits = options.search.replace(/\D/g, '')

      query.where((searchQuery) => {
        searchQuery
          .whereILike('legacy_number', term)
          .orWhereILike('internal_code', term)
          .orWhereILike('nature', term)
          .orWhereILike('action_type', term)
          .orWhereILike('tribunal', term)
          .orWhereILike('judicial_body', term)
          .orWhereHas('parties', (partyQuery) => partyQuery.whereILike('name', term))

        if (digits) {
          searchQuery
            .orWhere('cnj_number', 'like', `%${digits}%`)
            .orWhereHas('parties', (partyQuery) =>
              partyQuery.where('document', 'like', `%${digits}%`)
            )
        }
      })
    }

    if (options.cnjNumber) {
      query.where('cnj_number', options.cnjNumber)
    }
    if (options.folderId) {
      query.where('folder_id', options.folderId)
    }
    if (options.clientId) {
      query.whereIn(
        'folder_id',
        db
          .from('folders')
          .select('id')
          .where('tenant_id', tenantId)
          .where('client_id', options.clientId)
          .whereNull('deleted_at')
      )
    }
    if (options.status) {
      query.where('status', options.status)
    }
    if (options.instance) {
      query.where('instance', options.instance)
    }
    if (options.phase) {
      query.where('phase', options.phase)
    }
    if (options.electronic !== undefined) {
      query.where('electronic', options.electronic)
    }
    if (options.isPrimary !== undefined) {
      query.where('is_primary', options.isPrimary)
    }
    if (options.tribunal) {
      query.whereILike('tribunal', options.tribunal)
    }
    if (options.district) {
      query.whereILike('district', options.district)
    }
    if (options.judge) {
      query.whereILike('judge', options.judge)
    }
    if (options.partyDocument) {
      query.whereHas('parties', (partyQuery) =>
        partyQuery.where('document', options.partyDocument!)
      )
    }
    if (options.distributionDateFrom) {
      query.where('distribution_date', '>=', options.distributionDateFrom)
    }
    if (options.distributionDateTo) {
      query.where('distribution_date', '<=', options.distributionDateTo)
    }

    return query.orderBy(options.sortBy, options.direction).paginate(options.page, options.perPage)
  }

  async find(
    tenantId: number,
    processId: number,
    trx?: TransactionClientContract
  ): Promise<LegalProcess | null> {
    const query = trx ? LegalProcess.query({ client: trx }) : LegalProcess.query()

    return query
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where('id', processId)
      .whereIn(
        'folder_id',
        (trx ?? db)
          .from('folders')
          .select('id')
          .where('tenant_id', tenantId)
          .whereNull('deleted_at')
      )
      .preload('parties', (partyQuery) => {
        partyQuery.orderBy('side', 'asc').orderBy('is_primary', 'desc').orderBy('id', 'asc')
      })
      .first()
  }

  async findByCnj(
    tenantId: number,
    cnjNumber: string,
    trx?: TransactionClientContract
  ): Promise<LegalProcess | null> {
    const query = trx ? LegalProcess.query({ client: trx }) : LegalProcess.query()
    return query
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where('cnj_number', cnjNumber)
      .first()
  }

  async lockFolder(
    tenantId: number,
    folderId: number,
    trx: TransactionClientContract
  ): Promise<boolean> {
    const folder = await trx
      .from('folders')
      .where('tenant_id', tenantId)
      .where('id', folderId)
      .whereNull('deleted_at')
      .forUpdate()
      .first()

    return folder !== undefined && folder !== null
  }

  async create(
    tenantId: number,
    folderId: number,
    data: CreateProcessData,
    parties: PreparedProcessPartyData[],
    trx: TransactionClientContract
  ): Promise<LegalProcess> {
    const process = await LegalProcess.create(
      {
        ...this.toPersistenceData(data),
        tenant_id: tenantId,
        folder_id: folderId,
        cnj_number: data.cnj_number ?? null,
        legacy_number: data.legacy_number ?? null,
        internal_code: data.internal_code ?? null,
        status: data.status ?? 'active',
        instance: data.instance ?? null,
        phase: data.phase ?? null,
        distribution_type: data.distribution_type ?? null,
        electronic: data.electronic ?? null,
        is_primary: data.is_primary ?? false,
        nature: data.nature ?? null,
        action_type: data.action_type ?? null,
        tribunal: data.tribunal ?? null,
        judicial_body: data.judicial_body ?? null,
        district: data.district ?? null,
        forum: data.forum ?? null,
        court_division: data.court_division ?? null,
        judge: data.judge ?? null,
        case_value: this.toMoney(data.case_value),
        conviction_value: this.toMoney(data.conviction_value),
        costs: this.toMoney(data.costs),
        fees: this.toMoney(data.fees),
        observation: data.observation ?? null,
        object_detail: data.object_detail ?? null,
        metadata: data.metadata ?? {},
      },
      { client: trx }
    )

    if (parties.length > 0) {
      await ProcessParty.createMany(
        parties.map((party) => ({ ...party, tenant_id: tenantId, process_id: process.id })),
        { client: trx }
      )
    }

    return process
  }

  async update(
    process: LegalProcess,
    data: UpdateProcessData,
    parties: PreparedProcessPartyData[] | undefined,
    trx: TransactionClientContract
  ): Promise<void> {
    const { parties: ignoredParties, ...attributes } = data
    void ignoredParties
    process.useTransaction(trx)
    process.merge({
      ...this.toPersistenceData(attributes),
      metadata: data.metadata ? { ...process.metadata, ...data.metadata } : process.metadata,
    })
    await process.save()

    if (parties !== undefined) {
      await ProcessParty.query({ client: trx }).where('process_id', process.id).delete()
      if (parties.length > 0) {
        await ProcessParty.createMany(
          parties.map((party) => ({
            ...party,
            tenant_id: process.tenant_id!,
            process_id: process.id,
          })),
          { client: trx }
        )
      }
    }
  }

  async clearPrimary(
    tenantId: number,
    folderId: number,
    trx: TransactionClientContract,
    exceptProcessId?: number
  ): Promise<void> {
    const query = LegalProcess.query({ client: trx })
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where('folder_id', folderId)
      .where('is_primary', true)

    if (exceptProcessId) {
      query.whereNot('id', exceptProcessId)
    }

    await query.update({ is_primary: false })
  }

  async softDelete(process: LegalProcess, trx: TransactionClientContract): Promise<void> {
    process.useTransaction(trx)
    process.deletedAt = DateTime.now()
    process.is_primary = false
    await process.save()
  }

  private toPersistenceData(data: UpdateProcessData) {
    const {
      parties: ignoredParties,
      distribution_date: distributionDate,
      citation_date: citationDate,
      entry_date: entryDate,
      case_value: caseValue,
      conviction_value: convictionValue,
      costs,
      fees,
      ...attributes
    } = data
    void ignoredParties
    return {
      ...attributes,
      ...(distributionDate !== undefined
        ? { distribution_date: this.toDate(distributionDate) }
        : {}),
      ...(citationDate !== undefined ? { citation_date: this.toDate(citationDate) } : {}),
      ...(entryDate !== undefined ? { entry_date: this.toDate(entryDate) } : {}),
      ...(caseValue !== undefined ? { case_value: this.toMoney(caseValue) } : {}),
      ...(convictionValue !== undefined ? { conviction_value: this.toMoney(convictionValue) } : {}),
      ...(costs !== undefined ? { costs: this.toMoney(costs) } : {}),
      ...(fees !== undefined ? { fees: this.toMoney(fees) } : {}),
    }
  }

  private toDate(value: string | null | undefined): DateTime | null {
    return value ? DateTime.fromISO(value, { zone: 'utc' }) : null
  }

  private toMoney(value: string | number | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null
    }
    const [integer, fraction = ''] = String(value).split('.')
    return `${integer}.${fraction.padEnd(2, '0')}`
  }
}
