import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'

import ActivityService from '#modules/activities/services/activity_service'
import { FOLDER_STATUSES } from '#modules/folders/interfaces/folder_interface'
import type { FolderListInput, FolderStatus } from '#modules/folders/interfaces/folder_interface'
import type Folder from '#modules/folders/models/folder'
import FolderService from '#modules/folders/services/folder_service'
import ProcessService from '#modules/processes/services/process_service'
import type {
  WebFolder,
  WebFolderActivity,
  WebFolderDeadline,
  WebFolderDetailData,
  WebFolderFormOptions,
  WebFolderIndexData,
  WebFolderProcess,
} from '#modules/web/interfaces/folder_page_interface'

type CountRow = {
  processes_total: number
  tasks_open: number
  deadlines_open: number
  documents_total: number
}

type RawRows<Row> = {
  rows: Row[]
}

type DeadlineRow = {
  id: number
  title: string
  kind: string
  status: string
  priority: string
  is_fatal: boolean
  due_at: Date | string
  assignee_name: string | null
}

@inject()
export default class FolderPageService {
  constructor(
    private folderService: FolderService,
    private processService: ProcessService,
    private activityService: ActivityService
  ) {}

  async index(tenantId: number, input: FolderListInput): Promise<WebFolderIndexData> {
    const filters = {
      search: input.search ?? '',
      status: input.status ?? null,
      area: input.area ?? '',
      sort_by: input.sort_by ?? ('created_at' as const),
      order: input.order ?? ('desc' as const),
      per_page: input.per_page ?? 10,
    }
    const paginator = await this.folderService.list(tenantId, {
      ...input,
      sort_by: filters.sort_by,
      order: filters.order,
      per_page: filters.per_page,
    })

    const [statusRows, areaRows] = await Promise.all([
      db
        .from('folders')
        .select('status')
        .count('* as count')
        .where('tenant_id', tenantId)
        .whereNull('deleted_at')
        .groupBy('status'),
      db
        .from('folders')
        .distinct('area')
        .where('tenant_id', tenantId)
        .whereNull('deleted_at')
        .orderBy('area', 'asc'),
    ])

    const countByStatus = new Map(
      statusRows.map((row) => [row.status as FolderStatus, Number(row.count)])
    )
    const statusCounts = FOLDER_STATUSES.map((status) => ({
      status,
      count: countByStatus.get(status) ?? 0,
    }))

    return {
      folders: {
        data: paginator.all().map((folder) => this.folder(folder)),
        meta: {
          total: paginator.total,
          per_page: paginator.perPage,
          current_page: paginator.currentPage,
          last_page: paginator.lastPage,
        },
      },
      filters,
      areas: areaRows.map((row) => String(row.area)),
      status_counts: statusCounts,
      total_count: statusCounts.reduce((total, item) => total + item.count, 0),
    }
  }

  async formOptions(tenantId: number): Promise<WebFolderFormOptions> {
    const [clients, lawyers, areas] = await Promise.all([
      db
        .from('clients')
        .select('id', 'name', 'document', 'person_type', 'email')
        .where('tenant_id', tenantId)
        .whereNull('deleted_at')
        .orderBy('name', 'asc'),
      db
        .from('users')
        .innerJoin('user_tenants', 'user_tenants.user_id', 'users.id')
        .distinct('users.id', 'users.full_name', 'users.email')
        .where('user_tenants.tenant_id', tenantId)
        .where('users.is_deleted', false)
        .orderBy('users.full_name', 'asc'),
      db
        .from('folders')
        .distinct('area')
        .where('tenant_id', tenantId)
        .whereNull('deleted_at')
        .orderBy('area', 'asc'),
    ])

    return {
      clients: clients.map((client) => ({
        id: Number(client.id),
        name: String(client.name),
        document: String(client.document),
        person_type: String(client.person_type),
        email: client.email ? String(client.email) : null,
      })),
      lawyers: lawyers.map((lawyer) => ({
        id: Number(lawyer.id),
        full_name: String(lawyer.full_name),
        email: String(lawyer.email),
      })),
      areas: areas.map((row) => String(row.area)),
    }
  }

  async detail(tenantId: number, folderId: number): Promise<WebFolderDetailData> {
    const folder = await this.folderService.get(tenantId, folderId)

    const [countResult, processes, activityResult, deadlineRows] = await Promise.all([
      db.rawQuery<RawRows<CountRow>>(
        `SELECT
           (SELECT COUNT(*)::int FROM processes
             WHERE tenant_id = ? AND folder_id = ? AND deleted_at IS NULL) AS processes_total,
           (SELECT COUNT(*)::int FROM tasks
             WHERE tenant_id = ? AND folder_id = ? AND deleted_at IS NULL
               AND status NOT IN ('completed', 'cancelled')) AS tasks_open,
           (SELECT COUNT(*)::int FROM deadlines
             WHERE tenant_id = ? AND folder_id = ? AND deleted_at IS NULL
               AND status NOT IN ('completed', 'cancelled')) AS deadlines_open,
           (SELECT COUNT(*)::int FROM legal_documents
             WHERE tenant_id = ? AND folder_id = ? AND deleted_at IS NULL) AS documents_total`,
        [tenantId, folderId, tenantId, folderId, tenantId, folderId, tenantId, folderId]
      ),
      this.processService.listForFolder(tenantId, folderId, {
        page: 1,
        per_page: 6,
        sort_by: 'created_at',
        order: 'desc',
      }),
      this.activityService.listForFolder(tenantId, folderId, { limit: 8 }),
      db
        .from('deadlines as deadlines')
        .leftJoin('users as assignee', 'assignee.id', 'deadlines.assignee_id')
        .where('deadlines.tenant_id', tenantId)
        .where('deadlines.folder_id', folderId)
        .whereNull('deadlines.deleted_at')
        .whereNotIn('deadlines.status', ['completed', 'cancelled'])
        .select(
          'deadlines.id',
          'deadlines.title',
          'deadlines.kind',
          'deadlines.status',
          'deadlines.priority',
          'deadlines.is_fatal',
          'deadlines.due_at',
          'assignee.full_name as assignee_name'
        )
        .orderBy('deadlines.due_at', 'asc')
        .limit(5),
    ])

    return {
      folder: this.folder(folder),
      stats: countResult.rows[0],
      processes: processes.all().map((process) => this.process(process)),
      deadlines: deadlineRows.map((deadline) => this.deadline(deadline as DeadlineRow)),
      activities: activityResult.data.map((activity) => ({
        id: activity.id,
        event_type: activity.event_type,
        summary: activity.summary,
        occurred_at: activity.occurred_at.toISO()!,
        actor_name: activity.actor_id ? activity.actor.full_name : null,
      })),
    }
  }

  private folder(folder: Folder): WebFolder {
    return {
      id: folder.id,
      code: folder.code,
      title: folder.title,
      description: folder.description,
      status: folder.status,
      area: folder.area,
      subarea: folder.subarea,
      client: {
        id: folder.client.id,
        name: folder.client.name,
        document: folder.client.document,
        person_type: folder.client.person_type,
        email: folder.client.email,
      },
      responsible_lawyer: folder.responsible_lawyer_id
        ? {
            id: folder.responsible_lawyer.id,
            full_name: folder.responsible_lawyer.full_name,
            email: folder.responsible_lawyer.email,
          }
        : null,
      created_at: folder.created_at.toISO()!,
      updated_at: folder.updated_at.toISO()!,
    }
  }

  private process(process: Awaited<ReturnType<ProcessService['get']>>): WebFolderProcess {
    return {
      id: process.id,
      cnj_number: process.cnj_number,
      legacy_number: process.legacy_number,
      internal_code: process.internal_code,
      status: process.status,
      instance: process.instance,
      phase: process.phase,
      is_primary: process.is_primary,
      nature: process.nature,
      action_type: process.action_type,
      tribunal: process.tribunal,
      district: process.district,
      court_division: process.court_division,
      judge: process.judge,
      case_value: process.case_value,
      entry_date: process.entry_date?.toISODate() ?? null,
      created_at: process.created_at.toISO()!,
      parties: process.parties.map((party) => ({
        id: party.id,
        side: party.side,
        role: party.role,
        is_primary: party.is_primary,
        name: party.name,
        document: party.document,
      })),
    }
  }

  private deadline(deadline: DeadlineRow): WebFolderDeadline {
    return {
      id: Number(deadline.id),
      title: deadline.title,
      kind: deadline.kind,
      status: deadline.status,
      priority: deadline.priority,
      is_fatal: deadline.is_fatal,
      due_at: this.dateToIso(deadline.due_at),
      assignee_name: deadline.assignee_name,
    }
  }

  private dateToIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
  }
}
