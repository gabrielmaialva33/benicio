import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

import UsersRepository from '#modules/users/repositories/users_repository'
import JwtAuthTokensService, {
  type AccessTokenLifetime,
} from '#modules/auth/services/jwt_auth_tokens_service'
import SendVerificationEmailService from '#modules/auth/services/send_verification_email_service'
import IUser from '#modules/users/interfaces/user_interface'
import AuthEventService from '#modules/auth/services/auth_event_service'

type SignUpOptions = {
  ctx?: HttpContext
  accessTokenLifetime?: AccessTokenLifetime
}

@inject()
export default class SignUpService {
  constructor(
    private usersRepository: UsersRepository,
    private jwtAuthTokensService: JwtAuthTokensService,
    private sendVerificationEmailService: SendVerificationEmailService
  ) {}

  async run(payload: IUser.CreatePayload, options: SignUpOptions = {}) {
    const ctx = options.ctx ?? HttpContext.getOrFail()

    const user = await this.usersRepository.create(payload)
    await this.usersRepository.loadRoles(user)

    // Send verification email
    await this.sendVerificationEmailService.handle(user)

    const auth = await this.jwtAuthTokensService.run({ userId: user.id }, ctx, {
      accessTokenLifetime: options.accessTokenLifetime,
    })

    // Emit user registered event
    AuthEventService.emitUserRegistered(user, 'sign-up', false, ctx)

    // Emit login succeeded event (auto-login after registration)
    const isAdmin = user.roles.some((role) => role.name === 'ADMIN' || role.name === 'ROOT')
    AuthEventService.emitLoginSucceeded(user, 'password', isAdmin, ctx)

    const userJson = user.toJSON()

    return { ...userJson, auth }
  }
}
