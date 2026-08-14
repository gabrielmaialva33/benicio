import vine from '@vinejs/vine'

import {
  HEARING_SORT_FIELDS,
  HEARING_STATUSES,
  HEARING_TYPES,
} from '#modules/hearings/interfaces/hearing_interface'

const dateTime = () =>
  vine.date({ formats: ['YYYY-MM-DDTHH:mm:ss.SSS[Z]', 'YYYY-MM-DDTHH:mm:ssZ'] })
const nullableText = (maxLength: number) =>
  vine.string().trim().minLength(1).maxLength(maxLength).optional().nullable()
const attendee = vine.object({
  user_id: vine.number().positive(),
  role: nullableText(80),
  is_required: vine.boolean().optional(),
})

const hearingFields = {
  process_id: vine.number().positive(),
  title: vine.string().trim().minLength(1).maxLength(255),
  description: nullableText(10_000),
  type: vine.enum(HEARING_TYPES),
  status: vine.enum(HEARING_STATUSES).optional(),
  starts_at: dateTime(),
  ends_at: dateTime().optional().nullable(),
  location: nullableText(500),
  online_url: vine.string().trim().url().maxLength(2048).optional().nullable(),
  judge: nullableText(255),
  notes: nullableText(20_000),
  result: nullableText(20_000),
  attendees: vine.array(attendee).maxLength(100).optional(),
  metadata: vine.record(vine.any()).optional(),
}

export const listHearingsValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    per_page: vine.number().min(1).max(100).optional(),
    sort_by: vine.enum(HEARING_SORT_FIELDS).optional(),
    order: vine.enum(['asc', 'desc'] as const).optional(),
    search: vine.string().trim().maxLength(255).optional(),
    type: vine.enum(HEARING_TYPES).optional(),
    status: vine.enum(HEARING_STATUSES).optional(),
    process_id: vine.number().positive().optional(),
    folder_id: vine.number().positive().optional(),
    attendee_id: vine.number().positive().optional(),
    from: dateTime().optional(),
    to: dateTime().optional(),
  })
)

export const createHearingValidator = vine.compile(vine.object(hearingFields))

export const updateHearingValidator = vine.compile(
  vine.object({
    process_id: hearingFields.process_id.optional(),
    title: hearingFields.title.optional(),
    description: hearingFields.description,
    type: hearingFields.type.optional(),
    status: hearingFields.status,
    starts_at: hearingFields.starts_at.optional(),
    ends_at: hearingFields.ends_at,
    location: hearingFields.location,
    online_url: hearingFields.online_url,
    judge: hearingFields.judge,
    notes: hearingFields.notes,
    result: hearingFields.result,
    attendees: hearingFields.attendees,
    metadata: hearingFields.metadata,
  })
)

export const updateHearingStatusValidator = vine.compile(
  vine.object({ status: vine.enum(HEARING_STATUSES) })
)
