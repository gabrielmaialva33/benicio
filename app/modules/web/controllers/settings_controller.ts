import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import UpdateProfileService from '#modules/web/services/update_profile_service'
import { updateProfileValidator } from '#modules/web/validators/settings_validator'
import { inertiaRedirectTo } from '#shared/http/inertia_redirect'

@inject()
export default class InertiaSettingsController {
  constructor(private updateProfileService: UpdateProfileService) {}

  async index({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()

    return inertia.render('settings/index', {
      profile: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        username: user.username,
      },
    })
  }

  async updateProfile(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()

    const payload = await ctx.request.validateUsing(updateProfileValidator, {
      meta: { userId: user.id },
    })

    await this.updateProfileService.run(user.id, payload)

    ctx.session.flash('success', 'Profile updated successfully.')

    return inertiaRedirectTo(ctx, '/settings')
  }
}
