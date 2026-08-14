import LucidRepository from '#shared/lucid/lucid_repository'
import Tenant from '#modules/tenants/models/tenant'
import type ITenant from '#modules/tenants/interfaces/tenant_interface'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

export default class TenantRepository
  extends LucidRepository<typeof Tenant>
  implements ITenant.Repository
{
  constructor() {
    super(Tenant)
  }

  listForUser(
    userId: number,
    options: { activeOnly?: boolean; client?: TransactionClientContract } = {}
  ): Promise<Tenant[]> {
    const query = this.forUserQuery(userId, options.client)
    if (options.activeOnly) query.where('tenants.is_active', true)
    return query.orderBy('tenants.name', 'asc').orderBy('tenants.id', 'asc')
  }

  findForUser(
    userId: number,
    tenantId: number,
    options: { activeOnly?: boolean; client?: TransactionClientContract } = {}
  ): Promise<Tenant | null> {
    const query = this.forUserQuery(userId, options.client).where('tenants.id', tenantId)
    if (options.activeOnly) query.where('tenants.is_active', true)
    return query.first()
  }

  firstActiveForUser(userId: number, client?: TransactionClientContract): Promise<Tenant | null> {
    return this.forUserQuery(userId, client)
      .where('tenants.is_active', true)
      .orderBy('tenants.id', 'asc')
      .first()
  }

  private forUserQuery(
    userId: number,
    client?: TransactionClientContract
  ): ModelQueryBuilderContract<typeof Tenant> {
    const query = client ? this.model.query({ client }) : this.model.query()

    return query
      .select('tenants.*')
      .select('user_tenants.role as pivot_role')
      .innerJoin('user_tenants', 'user_tenants.tenant_id', 'tenants.id')
      .where('user_tenants.user_id', userId)
  }
}
