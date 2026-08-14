import db from '@adonisjs/lucid/services/db'

export type ClientSummaryRow = {
  total: number
  individuals: number
  companies: number
  with_active_folders: number
}

export type ClientOptionRow = {
  id: number
  name: string
  document: string
  person_type: string
  email: string | null
}

type RawRows<Row> = { rows: Row[] }

/**
 * Read-only projections owned by the clients domain.
 *
 * Every method requires the tenant id explicitly. Keeping these projections
 * here prevents Inertia page composers from knowing SQL or Lucid details.
 */
export default class ClientReadRepository {
  async summary(tenantId: number): Promise<ClientSummaryRow> {
    const result = await db.rawQuery<RawRows<ClientSummaryRow>>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE person_type = 'individual')::int AS individuals,
         COUNT(*) FILTER (WHERE person_type = 'company')::int AS companies,
         COUNT(*) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM folders
             WHERE folders.tenant_id = clients.tenant_id
               AND folders.client_id = clients.id
               AND folders.deleted_at IS NULL
               AND folders.status = 'active'
           )
         )::int AS with_active_folders
       FROM clients
       WHERE tenant_id = ? AND deleted_at IS NULL`,
      [tenantId]
    )

    return (
      result.rows[0] ?? {
        total: 0,
        individuals: 0,
        companies: 0,
        with_active_folders: 0,
      }
    )
  }

  async listOptions(tenantId: number): Promise<ClientOptionRow[]> {
    return db
      .from('clients')
      .select('id', 'name', 'document', 'person_type', 'email')
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .orderBy('name', 'asc')
  }
}
