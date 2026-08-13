import vine from '@vinejs/vine'

import {
  CLIENT_PERSON_TYPES,
  CLIENT_SORT_FIELDS,
} from '#modules/clients/interfaces/client_interface'

const nullableText = (maxLength: number) =>
  vine.string().trim().maxLength(maxLength).optional().nullable()

const documentSchema = vine
  .string()
  .trim()
  .maxLength(32)
  .regex(/^[A-Za-z0-9./\-\s]+$/)
  .transform((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, ''))

const addressSchema = vine
  .object({
    street: nullableText(255),
    number: nullableText(40),
    complement: nullableText(120),
    neighborhood: nullableText(120),
    city: nullableText(120),
    state: nullableText(80),
    postal_code: nullableText(20),
    country: nullableText(80),
  })
  .optional()
  .nullable()

const clientFields = {
  name: vine.string().trim().minLength(2).maxLength(255),
  document: documentSchema,
  person_type: vine.enum(CLIENT_PERSON_TYPES),
  email: vine.string().trim().email().maxLength(254).optional().nullable(),
  phone: nullableText(32),
  address: addressSchema,
  notes: nullableText(10_000),
  metadata: vine.record(vine.any()).optional(),
}

export const listClientsValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    per_page: vine.number().min(1).max(100).optional(),
    sort_by: vine.enum(CLIENT_SORT_FIELDS).optional(),
    order: vine.enum(['asc', 'desc'] as const).optional(),
    search: vine.string().trim().maxLength(255).optional(),
    person_type: vine.enum(CLIENT_PERSON_TYPES).optional(),
  })
)

export const createClientValidator = vine.compile(vine.object(clientFields))

export const updateClientValidator = vine.compile(
  vine.object({
    name: clientFields.name.optional(),
    document: documentSchema.optional(),
    person_type: clientFields.person_type.optional(),
    email: clientFields.email,
    phone: clientFields.phone,
    address: addressSchema,
    notes: clientFields.notes,
    metadata: clientFields.metadata,
  })
)
