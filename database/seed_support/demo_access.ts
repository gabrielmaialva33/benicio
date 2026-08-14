import hash from '@adonisjs/core/services/hash'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'

import {
  LEGAL_DEMO_PASSWORD,
  LEGAL_DEMO_REFERENCE_DATE,
  legalDemoTenant,
  legalDemoUsers,
  type DemoUserFixture,
  type LegalDemoUserKey,
} from '#database/fixtures/legal_demo'
import { withinSeedTransaction } from '#database/seed_support/transaction'
import Role from '#modules/roles/models/role'
import Tenant from '#modules/tenants/models/tenant'
import User from '#modules/users/models/user'

export interface LegalDemoAccessContext {
  tenantId: number
  userIds: Record<LegalDemoUserKey, number>
}

export interface DemoAccessContext<UserKey extends string> {
  tenantId: number
  userIds: Record<UserKey, number>
}

/** Seeds any deterministic user group into the shared development tenant. */
export function seedDemoAccess<UserKey extends string>(
  client: QueryClientContract,
  users: Record<UserKey, DemoUserFixture>
): Promise<DemoAccessContext<UserKey>> {
  return withinSeedTransaction(client, async (trx) => {
    const tenant = await Tenant.updateOrCreate({ slug: legalDemoTenant.slug }, legalDemoTenant, {
      client: trx,
    })
    const userIds = {} as Record<UserKey, number>
    const roleIds = new Map<string, number>()

    const fixtures = Object.values(users) as DemoUserFixture[]
    for (const slug of new Set(fixtures.flatMap((user) => user.systemRoles))) {
      const role = await Role.findByOrFail('slug', slug, { client: trx })
      roleIds.set(slug, role.id)
    }

    for (const [key, fixture] of Object.entries(users) as Array<[UserKey, DemoUserFixture]>) {
      const metadata = {
        email_verified: true,
        email_verification_token: null,
        email_verification_sent_at: null,
        email_verified_at: LEGAL_DEMO_REFERENCE_DATE,
      }
      let user = await User.findBy('email', fixture.email, { client: trx })

      if (!user) {
        user = await User.create(
          {
            full_name: fixture.full_name,
            email: fixture.email,
            username: fixture.username,
            password: LEGAL_DEMO_PASSWORD,
            is_deleted: false,
            metadata,
          },
          { client: trx }
        )
      } else {
        user.useTransaction(trx)
        user.merge({
          full_name: fixture.full_name,
          username: fixture.username,
          is_deleted: false,
          metadata,
        })

        if (
          !hash.isValidHash(user.password) ||
          !(await hash.verify(user.password, LEGAL_DEMO_PASSWORD))
        ) {
          user.password = LEGAL_DEMO_PASSWORD
        }
        await user.save()
      }

      userIds[key] = user.id

      await trx
        .table('user_tenants')
        .insert({
          user_id: user.id,
          tenant_id: tenant.id,
          role: fixture.tenantRole,
        })
        .onConflict(['user_id', 'tenant_id'])
        .merge({ role: fixture.tenantRole })

      const desiredRoleIds = fixture.systemRoles.map((slug) => roleIds.get(slug)!)
      const existingRoles = await trx
        .from('user_roles')
        .where('user_id', user.id)
        .whereIn('role_id', desiredRoleIds)
        .select('role_id')
      const existingRoleIds = new Set(existingRoles.map((row) => Number(row.role_id)))
      const missingRoles = desiredRoleIds
        .filter((roleId) => !existingRoleIds.has(roleId))
        .map((roleId) => ({ user_id: user.id, role_id: roleId }))

      if (missingRoles.length > 0) {
        await trx.table('user_roles').multiInsert(missingRoles)
      }
    }

    return { tenantId: tenant.id, userIds }
  })
}

/**
 * Creates the stable access boundary required by every tenant-scoped demo row.
 * It can safely run alone, before the domain seed, or inside a test transaction.
 */
export function seedLegalDemoAccess(client: QueryClientContract): Promise<LegalDemoAccessContext> {
  return seedDemoAccess(client, legalDemoUsers)
}
