import db from '@adonisjs/lucid/services/db'

import type { FolderStatus } from '#modules/folders/interfaces/folder_interface'

export type ClientFolderCountRow = {
  client_id: number
  folders_total: number
  active_folders: number
}

export type ClientFolderRow = {
  id: number
  code: string
  title: string
  status: FolderStatus
  area: string
  subarea: string | null
  created_at: Date | string
}

export type FolderStatusCountRow = {
  status: FolderStatus
  count: number
}

export type FolderDetailSummaryRow = {
  processes_total: number
  tasks_open: number
  deadlines_open: number
  documents_total: number
}

type RawRows<Row> = { rows: Row[] }

/** Read-only, tenant-scoped projections for folder-centric screens. */
export default class FolderReadRepository {
  async countsByClient(tenantId: number, clientIds: number[]): Promise<ClientFolderCountRow[]> {
    if (clientIds.length === 0) return []

    return db
      .from('folders')
      .select('client_id')
      .select(db.raw('COUNT(*)::int AS folders_total'))
      .select(db.raw("COUNT(*) FILTER (WHERE status = 'active')::int AS active_folders"))
      .where('tenant_id', tenantId)
      .whereIn('client_id', clientIds)
      .whereNull('deleted_at')
      .groupBy('client_id')
  }

  async listForClient(tenantId: number, clientId: number): Promise<ClientFolderRow[]> {
    return db
      .from('folders')
      .select('id', 'code', 'title', 'status', 'area', 'subarea', 'created_at')
      .where('tenant_id', tenantId)
      .where('client_id', clientId)
      .whereNull('deleted_at')
      .orderBy('updated_at', 'desc')
      .limit(50)
  }

  async statusCounts(tenantId: number): Promise<FolderStatusCountRow[]> {
    return db
      .from('folders')
      .select('status')
      .count('* as count')
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .groupBy('status')
  }

  async areas(tenantId: number): Promise<string[]> {
    const rows = await db
      .from('folders')
      .distinct('area')
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .orderBy('area', 'asc')

    return rows.map((row) => String(row.area))
  }

  async detailSummary(tenantId: number, folderId: number): Promise<FolderDetailSummaryRow> {
    const result = await db.rawQuery<RawRows<FolderDetailSummaryRow>>(
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
    )

    return result.rows[0]
  }
}
