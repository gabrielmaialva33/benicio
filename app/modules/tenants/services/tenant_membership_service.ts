import { inject } from '@adonisjs/core'

import TenantRepository from '#modules/tenants/repositories/tenant_repository'
import type Tenant from '#modules/tenants/models/tenant'

export type TenantMembershipDto = {
  id: number
  name: string
  slug: string
  is_active: boolean
  role: string | null
}

@inject()
export default class TenantMembershipService {
  constructor(private tenantRepository: TenantRepository) {}

  async list(userId: number): Promise<TenantMembershipDto[]> {
    const tenants = await this.tenantRepository.listForUser(userId)
    return tenants.map((tenant) => this.toDto(tenant))
  }

  async findActive(userId: number, tenantId: number): Promise<TenantMembershipDto | null> {
    const tenant = await this.tenantRepository.findForUser(userId, tenantId, { activeOnly: true })
    return tenant ? this.toDto(tenant) : null
  }

  async firstActive(userId: number): Promise<TenantMembershipDto | null> {
    const tenant = await this.tenantRepository.firstActiveForUser(userId)
    return tenant ? this.toDto(tenant) : null
  }

  private toDto(tenant: Tenant): TenantMembershipDto {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      is_active: tenant.is_active,
      role: (tenant.$extras.pivot_role as string | undefined) ?? null,
    }
  }
}
