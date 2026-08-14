import factory from '@adonisjs/lucid/factories'

import Tenant from '#modules/tenants/models/tenant'

export const TenantFactory = factory
  .define(Tenant, async ({ faker }) => {
    const name = faker.company.name()
    return {
      name,
      slug: `${faker.helpers.slugify(name).toLowerCase()}-${faker.string.alphanumeric(6).toLowerCase()}`,
      is_active: true,
    }
  })
  .state('inactive', (tenant) => {
    tenant.is_active = false
  })
  .state('lawFirm', (tenant, { faker }) => {
    const partners = faker.person.lastName()
    tenant.name = `${partners} Advogados`
    tenant.slug = `${faker.helpers.slugify(partners).toLowerCase()}-advogados-${faker.string.alphanumeric(6).toLowerCase()}`
  })
  .build()
