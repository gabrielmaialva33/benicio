import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import Activity from '#modules/activities/models/activity'
import type {
  ActivityCursor,
  ActivityListInput,
  RecordActivityData,
} from '#modules/activities/interfaces/activity_interface'

interface ActivityScope {
  folder_id?: number
  process_id?: number
}

export default class ActivityRepository {
  async record(data: RecordActivityData, trx?: TransactionClientContract): Promise<Activity> {
    return Activity.create(
      {
        tenant_id: data.tenant_id,
        folder_id: data.folder_id,
        process_id: data.process_id ?? null,
        actor_id: data.actor_id ?? null,
        event_type: data.event_type,
        summary: data.summary,
        data: data.data ?? {},
        occurred_at: data.occurred_at ? DateTime.fromJSDate(data.occurred_at) : DateTime.now(),
      },
      trx ? { client: trx } : undefined
    )
  }

  async list(tenantId: number, scope: ActivityScope, input: ActivityListInput) {
    const limit = input.limit ?? 50
    const cursor = input.cursor ? this.decodeCursor(input.cursor) : null
    const query = Activity.query()
      .where('tenant_id', tenantId)
      .preload('actor')
      .orderBy('occurred_at', 'desc')
      .orderBy('id', 'desc')

    if (scope.folder_id) query.where('folder_id', scope.folder_id)
    if (scope.process_id) query.where('process_id', scope.process_id)
    if (input.event_type) query.where('event_type', input.event_type)
    if (cursor) {
      const occurredAt = DateTime.fromISO(cursor.occurred_at, { setZone: true })
      query.where((cursorQuery) => {
        cursorQuery.where('occurred_at', '<', occurredAt.toJSDate()).orWhere((sameTimestamp) => {
          sameTimestamp.where('occurred_at', occurredAt.toJSDate()).where('id', '<', cursor.id)
        })
      })
    }

    const rows = await query.limit(limit + 1)
    const hasMore = rows.length > limit
    const data = hasMore ? rows.slice(0, limit) : rows
    const last = data.at(-1)

    return {
      data,
      meta: {
        has_more: hasMore,
        next_cursor: hasMore && last ? this.encodeCursor(last) : null,
      },
    }
  }

  findFolder(tenantId: number, folderId: number) {
    return db
      .from('folders')
      .where({ tenant_id: tenantId, id: folderId })
      .whereNull('deleted_at')
      .first()
  }

  findProcess(tenantId: number, processId: number) {
    return db
      .from('processes')
      .where({ tenant_id: tenantId, id: processId })
      .whereNull('deleted_at')
      .first()
  }

  private encodeCursor(activity: Activity): string {
    const cursor: ActivityCursor = {
      occurred_at: activity.occurred_at.toUTC().toISO()!,
      id: activity.id,
    }
    return Buffer.from(JSON.stringify(cursor)).toString('base64url')
  }

  private decodeCursor(value: string): ActivityCursor {
    try {
      const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown
      if (
        typeof decoded !== 'object' ||
        decoded === null ||
        !('occurred_at' in decoded) ||
        typeof decoded.occurred_at !== 'string' ||
        !DateTime.fromISO(decoded.occurred_at, { setZone: true }).isValid ||
        !('id' in decoded) ||
        typeof decoded.id !== 'number' ||
        !Number.isSafeInteger(decoded.id) ||
        decoded.id < 1
      ) {
        throw new Error('Invalid cursor payload')
      }
      return { occurred_at: decoded.occurred_at, id: decoded.id }
    } catch {
      throw new Error('Invalid activity cursor')
    }
  }
}
