import factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'

import { ProcessFactory } from '#database/factories/process_factory'
import { TenantFactory } from '#database/factories/tenant_factory'
import { UserFactory } from '#database/factories/user_factory'
import Hearing from '#modules/hearings/models/hearing'

export const HearingFactory = factory
  .define(Hearing, async ({ faker }) => {
    const startsAt = DateTime.fromJSDate(
      faker.date.between({
        from: DateTime.now().minus({ days: 30 }).toJSDate(),
        to: DateTime.now().plus({ days: 60 }).toJSDate(),
      })
    )
    const status = faker.helpers.arrayElement([
      'scheduled',
      'completed',
      'cancelled',
      'postponed',
    ] as const)

    return {
      title: faker.helpers.arrayElement([
        'Audiência de conciliação',
        'Audiência de instrução e julgamento',
        'Reunião técnica processual',
        'Sessão de julgamento',
      ]),
      description: faker.lorem.sentences(2),
      type: faker.helpers.arrayElement([
        'audience',
        'judgment',
        'conciliation',
        'instruction',
        'other',
      ] as const),
      status,
      starts_at: startsAt,
      ends_at: startsAt.plus({ minutes: faker.helpers.arrayElement([30, 60, 90, 120]) }),
      completed_at: status === 'completed' ? startsAt.plus({ hours: 2 }) : null,
      location: faker.datatype.boolean() ? `${faker.company.name()} - Sala 12` : null,
      online_url: null,
      judge: faker.datatype.boolean() ? faker.person.fullName() : null,
      notes: faker.datatype.boolean({ probability: 0.6 }) ? faker.lorem.paragraph() : null,
      result: status === 'completed' ? faker.lorem.sentence() : null,
      metadata: { synthetic: true, source: 'factory' },
      deletedAt: null,
    }
  })
  .relation('tenant', () => TenantFactory)
  .relation('process', () => ProcessFactory)
  .relation('creator', () => UserFactory)
  .relation('attendees', () => UserFactory)
  .state('upcoming', (hearing, { faker }) => {
    hearing.starts_at = DateTime.fromJSDate(faker.date.soon({ days: 45 }))
    hearing.ends_at = hearing.starts_at.plus({ hours: 1 })
    hearing.status = 'scheduled'
    hearing.completed_at = null
  })
  .state('completed', (hearing, { faker }) => {
    hearing.starts_at = DateTime.fromJSDate(faker.date.recent({ days: 15 }))
    hearing.ends_at = hearing.starts_at.plus({ hours: 1 })
    hearing.status = 'completed'
    hearing.completed_at = hearing.ends_at
  })
  .state('online', (hearing, { faker }) => {
    hearing.online_url = `https://meet.example.com/${faker.string.alphanumeric(16).toLowerCase()}`
    hearing.location = null
  })
  .state('audience', (hearing) => {
    hearing.type = 'audience'
    hearing.title = 'Audiência de instrução e julgamento'
  })
  .state('judgment', (hearing) => {
    hearing.type = 'judgment'
    hearing.title = 'Sessão de julgamento'
  })
  .state('conciliation', (hearing) => {
    hearing.type = 'conciliation'
    hearing.title = 'Audiência de conciliação'
  })
  .state('cancelled', (hearing) => {
    hearing.status = 'cancelled'
    hearing.completed_at = null
  })
  .state('deleted', (hearing) => {
    hearing.deletedAt = DateTime.now()
  })
  .build()
