import vine from '@vinejs/vine'

export const listActivitiesValidator = vine.compile(
  vine.object({
    limit: vine.number().min(1).max(100).optional(),
    cursor: vine.string().trim().maxLength(500).optional(),
    event_type: vine.string().trim().minLength(1).maxLength(100).optional(),
  })
)
