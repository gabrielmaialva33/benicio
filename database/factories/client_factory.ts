import factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'

import { cnpjFrom, cpfFrom } from '#database/factories/support/legal_identifiers'
import { TenantFactory } from '#database/factories/tenant_factory'
import Client from '#modules/clients/models/client'

const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const

function setIndividual(client: Client, documentBase: string, name: string) {
  client.person_type = 'individual'
  client.document = cpfFrom(documentBase)
  client.name = name
}

function setCompany(client: Client, documentBase: string, name: string) {
  client.person_type = 'company'
  client.document = cnpjFrom(documentBase)
  client.name = name
}

export const ClientFactory = factory
  .define(Client, async ({ faker }) => {
    const personType = faker.helpers.arrayElement(['individual', 'company'] as const)
    const suffix = faker.string.alphanumeric(10).toLowerCase()

    return {
      name: personType === 'individual' ? faker.person.fullName() : faker.company.name(),
      document:
        personType === 'individual'
          ? cpfFrom(faker.string.numeric(9))
          : cnpjFrom(faker.string.numeric(12)),
      person_type: personType,
      email: `cliente-${suffix}@example.com`,
      phone: faker.phone.number(),
      address: {
        street: faker.location.street(),
        number: faker.location.buildingNumber(),
        complement: faker.datatype.boolean() ? faker.location.secondaryAddress() : null,
        neighborhood: faker.location.county(),
        city: faker.location.city(),
        state: faker.helpers.arrayElement(BRAZILIAN_STATES),
        postal_code: faker.location.zipCode('########'),
        country: 'BR',
      },
      notes: faker.datatype.boolean() ? faker.lorem.paragraph() : null,
      metadata: {
        source: faker.helpers.arrayElement(['website', 'referral', 'event', 'organic']),
        priority: faker.helpers.arrayElement(['low', 'medium', 'high']),
        tags: faker.helpers.arrayElements(['vip', 'corporate', 'individual', 'frequent'], {
          min: 0,
          max: 2,
        }),
        synthetic: true,
      },
      deletedAt: null,
    }
  })
  .relation('tenant', () => TenantFactory)
  .state('individual', (client, { faker }) => {
    setIndividual(client, faker.string.numeric(9), faker.person.fullName())
  })
  .state('company', (client, { faker }) => {
    setCompany(client, faker.string.numeric(12), faker.company.name())
  })
  .state('vip', (client) => {
    client.metadata = { ...client.metadata, priority: 'high', tags: ['vip'] }
  })
  .state('deleted', (client) => {
    client.deletedAt = DateTime.now()
  })
  .build()
