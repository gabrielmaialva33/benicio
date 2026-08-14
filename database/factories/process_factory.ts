import factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'

import { cnjFrom } from '#database/factories/support/legal_identifiers'
import { TenantFactory } from '#database/factories/tenant_factory'
import LegalProcess from '#modules/processes/models/process'

export const ProcessFactory = factory
  .define(LegalProcess, async ({ faker }) => {
    const distributionDate = DateTime.fromJSDate(
      faker.date.between({ from: '2020-01-01', to: new Date() })
    )
    const cnjNumber = cnjFrom({
      sequence: faker.string.numeric(7),
      year: distributionDate.year,
      segment: 8,
      tribunal: faker.string.numeric(2),
      origin: faker.string.numeric(4),
    })

    return {
      cnj_number: cnjNumber,
      legacy_number: null,
      internal_code: `INT-${faker.string.alphanumeric(12).toUpperCase()}`,
      status: faker.helpers.arrayElement(['active', 'suspended', 'archived', 'closed'] as const),
      instance: faker.helpers.arrayElement(['first', 'second', 'superior'] as const),
      phase: faker.helpers.arrayElement([
        'knowledge',
        'execution',
        'appeal',
        'sentence_compliance',
      ] as const),
      distribution_type: faker.helpers.arrayElement([
        'lottery',
        'dependency',
        'prevention',
      ] as const),
      electronic: faker.datatype.boolean({ probability: 0.9 }),
      is_primary: true,
      nature: faker.helpers.arrayElement(['Cível', 'Trabalhista', 'Tributária', 'Administrativa']),
      action_type: faker.helpers.arrayElement([
        'Procedimento comum',
        'Execução de título',
        'Reclamação trabalhista',
        'Mandado de segurança',
      ]),
      tribunal: faker.helpers.arrayElement(['TJSP', 'TJRJ', 'TRT2', 'TRF3']),
      judicial_body: `${faker.number.int({ min: 1, max: 30 })}ª Vara`,
      district: faker.location.city(),
      forum: 'Foro Central',
      court_division: `${faker.number.int({ min: 1, max: 30 })}ª Vara`,
      judge: faker.person.fullName(),
      case_value: `${faker.number.int({ min: 10_000, max: 5_000_000 })}.00`,
      conviction_value: null,
      costs: `${faker.number.int({ min: 100, max: 50_000 })}.00`,
      fees: `${faker.number.int({ min: 1_000, max: 200_000 })}.00`,
      distribution_date: distributionDate,
      citation_date: distributionDate.plus({ days: faker.number.int({ min: 5, max: 45 }) }),
      entry_date: distributionDate,
      observation: faker.lorem.sentence(),
      object_detail: faker.lorem.paragraph(),
      metadata: { synthetic: true, source: 'factory' },
      deletedAt: null,
    }
  })
  .relation('tenant', () => TenantFactory)
  .state('active', (process) => {
    process.status = 'active'
  })
  .state('closed', (process) => {
    process.status = 'closed'
  })
  .state('appeal', (process) => {
    process.phase = 'appeal'
    process.instance = 'second'
  })
  .state('execution', (process) => {
    process.phase = 'execution'
  })
  .state('legacy', (process, { faker }) => {
    process.cnj_number = null
    process.legacy_number = `LEG-${faker.string.alphanumeric(16).toUpperCase()}`
  })
  .state('deleted', (process) => {
    process.deletedAt = DateTime.now()
  })
  .build()
