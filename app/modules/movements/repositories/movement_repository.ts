import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

import ActivityRepository from '#modules/activities/repositories/activity_repository'
import ProcessMovement from '#modules/movements/models/process_movement'
import type {
  CreateMovementData,
  MovementListInput,
  UpdateMovementData,
} from '#modules/movements/interfaces/movement_interface'

type ListOptions = Required<Pick<MovementListInput, 'page' | 'per_page' | 'sort_by' | 'order'>> &
  Omit<MovementListInput, 'page' | 'per_page' | 'sort_by' | 'order'>

@inject()
export default class MovementRepository {
  constructor(private activityRepository: ActivityRepository) {}

  async paginate(
    tenantId: number,
    options: ListOptions
  ): Promise<ModelPaginatorContract<ProcessMovement>> {
    const query = ProcessMovement.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .preload('creator')

    if (options.search) {
      query.where((search) =>
        search
          .whereILike('title', `%${options.search}%`)
          .orWhereILike('description', `%${options.search}%`)
          .orWhereILike('kind', `%${options.search}%`)
      )
    }
    if (options.kind) query.where('kind', options.kind)
    if (options.source) query.where('source', options.source)
    if (options.process_id) query.where('process_id', options.process_id)
    if (options.folder_id) {
      query.whereIn(
        'process_id',
        db
          .from('processes')
          .select('id')
          .where('tenant_id', tenantId)
          .where('folder_id', options.folder_id)
          .whereNull('deleted_at')
      )
    }
    if (options.from) query.where('occurred_at', '>=', options.from)
    if (options.to) query.where('occurred_at', '<=', options.to)

    return query.orderBy(options.sort_by, options.order).paginate(options.page, options.per_page)
  }

  async find(tenantId: number, movementId: number): Promise<ProcessMovement | null> {
    return ProcessMovement.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where('id', movementId)
      .preload('creator')
      .first()
  }

  findProcess(tenantId: number, processId: number) {
    return db
      .from('processes')
      .where({ tenant_id: tenantId, id: processId })
      .whereNull('deleted_at')
      .first()
  }

  findByExternalId(tenantId: number, source: string, externalId: string) {
    return ProcessMovement.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where({ source, external_id: externalId })
      .first()
  }

  async create(
    tenantId: number,
    folderId: number,
    processId: number,
    creatorId: number,
    data: CreateMovementData
  ): Promise<ProcessMovement> {
    const movementId = await db.transaction(async (trx) => {
      const movement = await ProcessMovement.create(
        {
          tenant_id: tenantId,
          process_id: processId,
          created_by: creatorId,
          occurred_at: DateTime.fromJSDate(data.occurred_at),
          kind: data.kind,
          title: data.title,
          description: data.description ?? null,
          source: data.source ?? 'manual',
          external_id: data.external_id ?? null,
          metadata: data.metadata ?? {},
        },
        { client: trx }
      )
      await this.activityRepository.record(
        {
          tenant_id: tenantId,
          folder_id: folderId,
          process_id: processId,
          actor_id: creatorId,
          event_type: 'process.movement.created',
          summary: data.title,
          data: { movement_id: movement.id, kind: data.kind, source: data.source ?? 'manual' },
          occurred_at: data.occurred_at,
        },
        trx
      )
      return movement.id
    })

    return (await this.find(tenantId, movementId))!
  }

  async update(
    movement: ProcessMovement,
    folderId: number,
    actorId: number,
    data: UpdateMovementData
  ): Promise<ProcessMovement> {
    await db.transaction(async (trx) => {
      movement.useTransaction(trx)
      const { occurred_at: occurredAt, metadata, ...fields } = data
      movement.merge({
        ...fields,
        occurred_at: occurredAt ? DateTime.fromJSDate(occurredAt) : movement.occurred_at,
        metadata: metadata ? { ...movement.metadata, ...metadata } : movement.metadata,
      })
      await movement.save()
      await this.activityRepository.record(
        {
          tenant_id: movement.tenant_id!,
          folder_id: folderId,
          process_id: movement.process_id,
          actor_id: actorId,
          event_type: 'process.movement.updated',
          summary: movement.title,
          data: { movement_id: movement.id, changed_fields: Object.keys(data) },
        },
        trx
      )
    })

    return (await this.find(movement.tenant_id!, movement.id))!
  }

  async softDelete(movement: ProcessMovement, folderId: number, actorId: number): Promise<void> {
    await db.transaction(async (trx) => {
      movement.useTransaction(trx)
      await movement.softDelete()
      await this.activityRepository.record(
        {
          tenant_id: movement.tenant_id!,
          folder_id: folderId,
          process_id: movement.process_id,
          actor_id: actorId,
          event_type: 'process.movement.deleted',
          summary: movement.title,
          data: { movement_id: movement.id },
        },
        trx
      )
    })
  }
}
