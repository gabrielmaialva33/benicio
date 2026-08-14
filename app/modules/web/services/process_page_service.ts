import { inject } from '@adonisjs/core'

import type Folder from '#modules/folders/models/folder'
import FolderService from '#modules/folders/services/folder_service'
import type LegalProcess from '#modules/processes/models/process'
import ProcessService from '#modules/processes/services/process_service'
import type {
  WebProcess,
  WebProcessDetailData,
  WebProcessFolder,
  WebProcessFormData,
} from '#modules/web/interfaces/process_page_interface'

@inject()
export default class ProcessPageService {
  constructor(
    private folderService: FolderService,
    private processService: ProcessService
  ) {}

  async form(tenantId: number, folderId: number): Promise<{ folder: WebProcessFolder }>
  async form(
    tenantId: number,
    folderId: number,
    processId: number
  ): Promise<{ folder: WebProcessFolder; process: WebProcess }>
  async form(tenantId: number, folderId: number, processId?: number): Promise<WebProcessFormData> {
    const folder = await this.folderService.get(tenantId, folderId)
    if (processId === undefined) {
      return { folder: this.folder(folder) }
    }

    const process = await this.processService.getForFolder(tenantId, folderId, processId)
    return { folder: this.folder(folder), process: this.process(process) }
  }

  async detail(
    tenantId: number,
    folderId: number,
    processId: number
  ): Promise<WebProcessDetailData> {
    const [folder, process] = await Promise.all([
      this.folderService.get(tenantId, folderId),
      this.processService.getForFolder(tenantId, folderId, processId),
    ])

    return { folder: this.folder(folder), process: this.process(process) }
  }

  private folder(folder: Folder): WebProcessFolder {
    return {
      id: folder.id,
      code: folder.code,
      title: folder.title,
      area: folder.area,
      client: {
        id: folder.client.id,
        name: folder.client.name,
      },
    }
  }

  private process(process: LegalProcess): WebProcess {
    return {
      id: process.id,
      folder_id: process.folder_id,
      cnj_number: process.cnj_number,
      legacy_number: process.legacy_number,
      internal_code: process.internal_code,
      status: process.status,
      instance: process.instance,
      phase: process.phase,
      distribution_type: process.distribution_type,
      electronic: process.electronic,
      is_primary: process.is_primary,
      nature: process.nature,
      action_type: process.action_type,
      tribunal: process.tribunal,
      judicial_body: process.judicial_body,
      district: process.district,
      forum: process.forum,
      court_division: process.court_division,
      judge: process.judge,
      case_value: process.case_value,
      conviction_value: process.conviction_value,
      costs: process.costs,
      fees: process.fees,
      distribution_date: process.distribution_date?.toISODate() ?? null,
      citation_date: process.citation_date?.toISODate() ?? null,
      entry_date: process.entry_date?.toISODate() ?? null,
      observation: process.observation,
      object_detail: process.object_detail,
      created_at: process.created_at.toISO()!,
      updated_at: process.updated_at.toISO()!,
      parties: process.parties.map((party) => ({
        id: party.id,
        side: party.side,
        role: party.role,
        is_primary: party.is_primary,
        name: party.name,
        document: party.document,
        person_type: party.person_type,
      })),
    }
  }
}
