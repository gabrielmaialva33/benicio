import { DateTime } from 'luxon'
import vine from '@vinejs/vine'

import { normalizeCnj } from '#modules/processes/domain/cnj'
import {
  PROCESS_DISTRIBUTION_TYPES,
  PROCESS_INSTANCES,
  PROCESS_PARTY_PERSON_TYPES,
  PROCESS_PARTY_SIDES,
  PROCESS_PHASES,
  PROCESS_SORT_FIELDS,
  PROCESS_STATUSES,
} from '#modules/processes/interfaces/process_interface'

const nullableText = (maxLength: number) =>
  vine.string().trim().minLength(1).maxLength(maxLength).optional().nullable()

const cnjSchema = vine
  .string()
  .trim()
  .maxLength(32)
  .regex(/^[0-9.\-\s]+$/)
  .transform((value) => (value === null ? value : normalizeCnj(value)))

const documentSchema = vine
  .string()
  .trim()
  .maxLength(32)
  .regex(/^[A-Za-z0-9./\-\s]+$/)
  .transform((value) => (value === null ? value : value.toUpperCase().replace(/[^A-Z0-9]/g, '')))

const moneySchema = vine.unionOfTypes([
  vine
    .string()
    .trim()
    .regex(/^(0|[1-9][0-9]{0,15})(\.[0-9]{1,2})?$/),
  vine
    .number()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER / 100)
    .decimal([0, 2]),
])

const dateSchema = vine
  .date({ formats: ['YYYY-MM-DD'] })
  .transform((value) => (value === null ? value : DateTime.fromJSDate(value).toISODate()!))

const partySchema = vine.object({
  side: vine.enum(PROCESS_PARTY_SIDES),
  role: nullableText(80),
  is_primary: vine.boolean().optional(),
  name: vine.string().trim().minLength(2).maxLength(255),
  document: documentSchema.optional().nullable(),
  person_type: vine.enum(PROCESS_PARTY_PERSON_TYPES).optional().nullable(),
  metadata: vine.record(vine.any()).optional(),
})

const processFields = {
  cnj_number: cnjSchema.optional().nullable(),
  legacy_number: nullableText(80),
  internal_code: nullableText(80),
  status: vine.enum(PROCESS_STATUSES).optional(),
  instance: vine.enum(PROCESS_INSTANCES).optional().nullable(),
  phase: vine.enum(PROCESS_PHASES).optional().nullable(),
  distribution_type: vine.enum(PROCESS_DISTRIBUTION_TYPES).optional().nullable(),
  electronic: vine.boolean().optional().nullable(),
  is_primary: vine.boolean().optional(),
  nature: nullableText(120),
  action_type: nullableText(160),
  tribunal: nullableText(160),
  judicial_body: nullableText(160),
  district: nullableText(160),
  forum: nullableText(160),
  court_division: nullableText(160),
  judge: nullableText(160),
  case_value: moneySchema.optional().nullable(),
  conviction_value: moneySchema.optional().nullable(),
  costs: moneySchema.optional().nullable(),
  fees: moneySchema.optional().nullable(),
  distribution_date: dateSchema.optional().nullable(),
  citation_date: dateSchema.optional().nullable(),
  entry_date: dateSchema.optional().nullable(),
  observation: nullableText(10_000),
  object_detail: nullableText(10_000),
  metadata: vine.record(vine.any()).optional(),
  parties: vine.array(partySchema).maxLength(100).optional(),
}

export const listProcessesValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    per_page: vine.number().min(1).max(100).optional(),
    sort_by: vine.enum(PROCESS_SORT_FIELDS).optional(),
    order: vine.enum(['asc', 'desc'] as const).optional(),
    search: vine.string().trim().maxLength(255).optional(),
    cnj_number: cnjSchema.optional(),
    folder_id: vine.number().positive().optional(),
    client_id: vine.number().positive().optional(),
    status: vine.enum(PROCESS_STATUSES).optional(),
    instance: vine.enum(PROCESS_INSTANCES).optional(),
    phase: vine.enum(PROCESS_PHASES).optional(),
    electronic: vine.boolean().optional(),
    is_primary: vine.boolean().optional(),
    tribunal: vine.string().trim().maxLength(160).optional(),
    district: vine.string().trim().maxLength(160).optional(),
    judge: vine.string().trim().maxLength(160).optional(),
    party_document: documentSchema.optional(),
    distribution_date_from: dateSchema.optional(),
    distribution_date_to: dateSchema.optional(),
  })
)

export const createProcessValidator = vine.compile(vine.object(processFields))

export const updateProcessValidator = vine.compile(
  vine.object({
    cnj_number: processFields.cnj_number,
    legacy_number: processFields.legacy_number,
    internal_code: processFields.internal_code,
    status: processFields.status,
    instance: processFields.instance,
    phase: processFields.phase,
    distribution_type: processFields.distribution_type,
    electronic: processFields.electronic,
    is_primary: processFields.is_primary,
    nature: processFields.nature,
    action_type: processFields.action_type,
    tribunal: processFields.tribunal,
    judicial_body: processFields.judicial_body,
    district: processFields.district,
    forum: processFields.forum,
    court_division: processFields.court_division,
    judge: processFields.judge,
    case_value: processFields.case_value,
    conviction_value: processFields.conviction_value,
    costs: processFields.costs,
    fees: processFields.fees,
    distribution_date: processFields.distribution_date,
    citation_date: processFields.citation_date,
    entry_date: processFields.entry_date,
    observation: processFields.observation,
    object_detail: processFields.object_detail,
    metadata: processFields.metadata,
    parties: processFields.parties,
  })
)
