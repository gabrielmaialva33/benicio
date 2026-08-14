import { inject } from '@adonisjs/core'

import ActivityService from '#modules/activities/services/activity_service'
import ClientReadRepository from '#modules/clients/repositories/client_read_repository'
import type Deadline from '#modules/deadlines/models/deadline'
import DeadlineRepository from '#modules/deadlines/repositories/deadline_repository'
import type { FolderListInput, FolderStatus } from '#modules/folders/interfaces/folder_interface'
import { FOLDER_STATUSES } from '#modules/folders/interfaces/folder_interface'
import type Folder from '#modules/folders/models/folder'
import FolderReadRepository from '#modules/folders/repositories/folder_read_repository'
import FolderService from '#modules/folders/services/folder_service'
import ProcessService from '#modules/processes/services/process_service'
import UsersRepository from '#modules/users/repositories/users_repository'
import type {
  WebFolder,
  WebFolderDeadline,
  WebFolderDetailData,
  WebFolderFormOptions,
  WebFolderIndexData,
  WebFolderProcess,
} from '#modules/web/interfaces/folder_page_interface'

@inject()
export default class FolderPageService {
  constructor(
    private folderService: FolderService,
    private processService: ProcessService,
    private activityService: ActivityService,
    private folderReadRepository: FolderReadRepository,
    private clientReadRepository: ClientReadRepository,
    private deadlineRepository: DeadlineRepository,
    private usersRepository: UsersRepository
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

    const [statusRows, areas] = await Promise.all([
      this.folderReadRepository.statusCounts(tenantId),
      this.folderReadRepository.areas(tenantId),
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
      areas,
      status_counts: statusCounts,
      total_count: statusCounts.reduce((total, item) => total + item.count, 0),
    }
  }

  async formOptions(tenantId: number): Promise<WebFolderFormOptions> {
    const [clients, lawyers, areas] = await Promise.all([
      this.clientReadRepository.listOptions(tenantId),
      this.usersRepository.listActiveForTenant(tenantId),
      this.folderReadRepository.areas(tenantId),
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
      areas,
    }
  }

  async detail(tenantId: number, folderId: number): Promise<WebFolderDetailData> {
    const folder = await this.folderService.get(tenantId, folderId)

    const [stats, processes, activityResult, deadlines] = await Promise.all([
      this.folderReadRepository.detailSummary(tenantId, folderId),
      this.processService.listForFolder(tenantId, folderId, {
        page: 1,
        per_page: 6,
        sort_by: 'created_at',
        order: 'desc',
      }),
      this.activityService.listForFolder(tenantId, folderId, { limit: 8 }),
      this.deadlineRepository.listOpenForFolder(tenantId, folderId, 5),
    ])

    return {
      folder: this.folder(folder),
      stats,
      processes: processes.all().map((process) => this.process(process)),
      deadlines: deadlines.map((deadline) => this.deadline(deadline)),
      activities: activityResult.data.map((activity) => ({
        id: activity.id,
        event_type: activity.event_type,
        summary: activity.summary,
        occurred_at: activity.occurred_at.toISO()!,
        actor_name: activity.actor?.full_name ?? null,
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
      responsible_lawyer: folder.responsible_lawyer?.id
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

  private deadline(deadline: Deadline): WebFolderDeadline {
    return {
      id: Number(deadline.id),
      title: deadline.title,
      kind: deadline.kind,
      status: deadline.status,
      priority: deadline.priority,
      is_fatal: deadline.is_fatal,
      due_at: deadline.due_at.toISO()!,
      assignee_name: deadline.assignee?.full_name ?? null,
    }
  }
}
