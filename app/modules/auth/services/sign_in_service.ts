import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import JwtAuthTokensService, {
  type AccessTokenLifetime,
  GenerateAuthTokensResponse,
} from '#modules/auth/services/jwt_auth_tokens_service'
import UsersRepository from '#modules/users/repositories/users_repository'
import AuthEventService from '#modules/auth/services/auth_event_service'
import User from '#modules/users/models/user'
import RolesRepository from '#modules/roles/repositories/roles_repository'
import TenantMembershipService from '#modules/tenants/services/tenant_membership_service'

type SignInRequest = {
  uid: string
  password: string
  ctx: HttpContext
  accessTokenLifetime?: AccessTokenLifetime
}

type SignInResponse = User & {
  auth: GenerateAuthTokensResponse
}

@inject()
export default class SignInService {
  constructor(
    private usersRepository: UsersRepository,
    private rolesRepository: RolesRepository,
    private tenantMembershipService: TenantMembershipService,
    private jwtAuthTokensService: JwtAuthTokensService
  ) {}

  async run({ uid, password, ctx, accessTokenLifetime }: SignInRequest): Promise<SignInResponse> {
    // Emit login attempted event
    AuthEventService.emitLoginAttempted(uid, ctx)

    try {
      const user = await this.usersRepository.verifyCredentialsWithRoles(uid, password)

      // Active tenant = the user's first tenant (N:N via user_tenants). May be
      // undefined when the user belongs to no tenant; that is acceptable.
      const tenant = await this.tenantMembershipService.firstActive(user.id)

      const auth = await this.jwtAuthTokensService.run(
        { userId: user.id, tenantId: tenant?.id },
        ctx,
        { accessTokenLifetime }
      )
      const userJson = user.toJSON()

      // Check if the user is admin
      const isAdmin = this.rolesRepository.isAdmin(user.roles)

      // Emit login succeeded event
      AuthEventService.emitLoginSucceeded(user, 'password', isAdmin, ctx)

      return { ...userJson, auth } as SignInResponse
    } catch (error) {
      // Emit login failed event
      const reason = error instanceof Error ? error.message : 'Invalid credentials'
      AuthEventService.emitLoginFailed(uid, reason || 'Invalid credentials', ctx)
      throw error
    }
  }
}
