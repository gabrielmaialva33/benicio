import { randomUUID } from 'node:crypto'

import Role from '#modules/roles/models/role'
import Tenant from '#modules/tenants/models/tenant'
import User from '#modules/users/models/user'
import IRole from '#modules/roles/interfaces/role_interface'

export async function createLegalAdmin(tenantCount: number = 1) {
  const suffix = randomUUID()
  const user = await User.create({
    full_name: 'Legal Admin',
    email: `legal-${suffix}@example.com`,
    username: `legal-${suffix}`,
    password: 'password123',
  })
  const adminRole = await Role.findByOrFail('slug', IRole.Slugs.ADMIN)
  await user.related('roles').sync([adminRole.id])

  const tenants: Tenant[] = []
  for (let index = 0; index < tenantCount; index++) {
    const tenant = await Tenant.create({
      name: `Legal Tenant ${index + 1}`,
      slug: `legal-${suffix}-${index + 1}`,
      is_active: true,
    })
    tenants.push(tenant)
  }

  await user
    .related('tenants')
    .attach(Object.fromEntries(tenants.map((tenant) => [tenant.id, { role: 'admin' }])))

  return { user, tenants }
}
