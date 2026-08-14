import vine from '@vinejs/vine'

export const dashboardWidgetValidator = vine.compile(
  vine.object({ limit: vine.number().min(1).max(50).optional() })
)
