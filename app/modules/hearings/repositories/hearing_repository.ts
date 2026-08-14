import db from '@adonisjs/lucid/services/db'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'

import Hearing from '#modules/hearings/models/hearing'
import type {
  CreateHearingData,
  HearingAttendeeInput,
  HearingListInput,
  UpdateHearingData,
} from '#modules/hearings/interfaces/hearing_interface'

type ListOptions = Required<Pick<HearingListInput, 'page' | 'per_page' | 'sort_by' | 'order'>> &
  Omit<HearingListInput, 'page' | 'per_page' | 'sort_by' | 'order'>

export default class HearingRepository {
  async paginate(tenantId: number, options: ListOptions): Promise<ModelPaginatorContract<Hearing>> {
    const query = Hearing.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .preload('attendees')
      .preload('creator')

    if (options.search) {
      query.where((search) =>
        search
          .whereILike('title', `%${options.search}%`)
          .orWhereILike('description', `%${options.search}%`)
          .orWhereILike('location', `%${options.search}%`)
      )
    }
    if (options.type) query.where('type', options.type)
    if (options.status) query.where('status', options.status)
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
    if (options.attendee_id) {
      query.whereHas('attendees', (attendee) => attendee.where('users.id', options.attendee_id!))
    }
    if (options.from) query.where('starts_at', '>=', options.from)
    if (options.to) query.where('starts_at', '<=', options.to)

    return query.orderBy(options.sort_by, options.order).paginate(options.page, options.per_page)
  }

  async find(tenantId: number, hearingId: number): Promise<Hearing | null> {
    return Hearing.query()
      .withScopes((scopes) => scopes.withTenant(tenantId))
      .where('id', hearingId)
      .preload('attendees')
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

  async usersInTenant(tenantId: number, userIds: number[]): Promise<number[]> {
    if (userIds.length === 0) return []
    const rows = await db
      .from('user_tenants')
      .innerJoin('users', 'users.id', 'user_tenants.user_id')
      .where('user_tenants.tenant_id', tenantId)
      .whereIn('user_tenants.user_id', userIds)
      .where('users.is_deleted', false)
      .select('user_tenants.user_id')
    return rows.map((row) => Number(row.user_id))
  }

  async create(tenantId: number, creatorId: number, data: CreateHearingData): Promise<Hearing> {
    const hearingId = await db.transaction(async (trx) => {
      const status = data.status ?? 'scheduled'
      const hearing = await Hearing.create(
        {
          tenant_id: tenantId,
          creator_id: creatorId,
          process_id: data.process_id,
          title: data.title,
          description: data.description ?? null,
          type: data.type,
          status,
          starts_at: DateTime.fromJSDate(data.starts_at),
          ends_at: data.ends_at ? DateTime.fromJSDate(data.ends_at) : null,
          completed_at: status === 'completed' ? DateTime.now() : null,
          location: data.location ?? null,
          online_url: data.online_url ?? null,
          judge: data.judge ?? null,
          notes: data.notes ?? null,
          result: data.result ?? null,
          metadata: data.metadata ?? {},
        },
        { client: trx }
      )
      await this.syncAttendees(hearing, tenantId, data.attendees ?? [])
      return hearing.id
    })
    return (await this.find(tenantId, hearingId))!
  }

  async update(hearing: Hearing, tenantId: number, data: UpdateHearingData): Promise<Hearing> {
    await db.transaction(async (trx) => {
      hearing.useTransaction(trx)
      const { attendees, metadata, starts_at: startsAt, ends_at: endsAt, ...fields } = data
      const status = data.status ?? hearing.status
      hearing.merge({
        ...fields,
        starts_at: startsAt ? DateTime.fromJSDate(startsAt) : hearing.starts_at,
        ends_at:
          endsAt === undefined ? hearing.ends_at : endsAt ? DateTime.fromJSDate(endsAt) : null,
        completed_at: status === 'completed' ? (hearing.completed_at ?? DateTime.now()) : null,
        metadata: metadata ? { ...hearing.metadata, ...metadata } : hearing.metadata,
      })
      await hearing.save()
      if (attendees !== undefined) {
        await this.syncAttendees(hearing, tenantId, attendees)
      }
    })
    return (await this.find(tenantId, hearing.id))!
  }

  async softDelete(hearing: Hearing): Promise<void> {
    await hearing.softDelete()
  }

  private async syncAttendees(
    hearing: Hearing,
    tenantId: number,
    attendees: HearingAttendeeInput[]
  ): Promise<void> {
    await hearing.related('attendees').sync(
      Object.fromEntries(
        attendees.map((attendee) => [
          attendee.user_id,
          {
            tenant_id: tenantId,
            role: attendee.role ?? null,
            is_required: attendee.is_required ?? true,
          },
        ])
      )
    )
  }
}
