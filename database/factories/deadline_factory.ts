import factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'

import { ProcessFactory } from '#database/factories/process_factory'
import { TenantFactory } from '#database/factories/tenant_factory'
import { UserFactory } from '#database/factories/user_factory'
import Deadline from '#modules/deadlines/models/deadline'

export const DeadlineFactory = factory
  .define(Deadline, async ({ faker }) => {
    const status = faker.helpers.arrayElement([
      'pending',
      'in_progress',
      'completed',
      'cancelled',
    ] as const)
    const dueAt = DateTime.fromJSDate(faker.date.soon({ days: 45 }))

    return {
      title: faker.helpers.arrayElement([
        'Prazo para contestação',
        'Prazo para manifestação',
        'Prazo recursal',
        'Prazo administrativo',
      ]),
      description: faker.lorem.sentences(2),
      kind: faker.helpers.arrayElement([
        'judicial',
        'extrajudicial',
        'administrative',
        'internal',
      ] as const),
      status,
      priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent'] as const),
      is_fatal: faker.datatype.boolean({ probability: 0.2 }),
      due_at: dueAt,
      completed_at: status === 'completed' ? dueAt.minus({ hours: 3 }) : null,
      legal_basis: faker.datatype.boolean() ? 'CPC, contagem em dias úteis' : null,
      notes: faker.datatype.boolean() ? faker.lorem.paragraph() : null,
      metadata: { synthetic: true, source: 'factory' },
      deletedAt: null,
    }
  })
  .relation('tenant', () => TenantFactory)
  .relation('process', () => ProcessFactory)
  .relation('assignee', () => UserFactory)
  .relation('creator', () => UserFactory)
  .state('fatal', (deadline) => {
    deadline.is_fatal = true
    deadline.priority = 'urgent'
  })
  .state('overdue', (deadline, { faker }) => {
    deadline.status = 'pending'
    deadline.due_at = DateTime.now().minus({ days: faker.number.int({ min: 1, max: 15 }) })
    deadline.completed_at = null
  })
  .state('completed', (deadline) => {
    deadline.status = 'completed'
    deadline.completed_at = DateTime.now().minus({ hours: 1 })
  })
  .state('judicial', (deadline) => {
    deadline.kind = 'judicial'
  })
  .state('administrative', (deadline) => {
    deadline.kind = 'administrative'
  })
  .state('deleted', (deadline) => {
    deadline.deletedAt = DateTime.now()
  })
  .build()
