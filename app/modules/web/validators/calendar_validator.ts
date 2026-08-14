import vine from '@vinejs/vine'

import { CALENDAR_VIEWS } from '#modules/web/interfaces/calendar_page_interface'

export const calendarQueryValidator = vine.compile(
  vine.object({
    // `YYYY-MM`; anything off-format falls back to the current month in the service.
    month: vine
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
    view: vine.enum(CALENDAR_VIEWS).optional(),
  })
)
