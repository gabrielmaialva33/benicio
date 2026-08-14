import vine from '@vinejs/vine'

export const requestPasswordResetValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().maxLength(255),
  })
)

export const resetPasswordValidator = vine.compile(
  vine.object({
    token: vine.string().trim().minLength(10).maxLength(255),
    password: vine.string().minLength(8).maxLength(255).confirmed(),
  })
)
