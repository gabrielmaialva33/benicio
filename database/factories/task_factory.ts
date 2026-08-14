import factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'

import { ProcessFactory } from '#database/factories/process_factory'
import { TenantFactory } from '#database/factories/tenant_factory'
import { UserFactory } from '#database/factories/user_factory'
import Task from '#modules/tasks/models/task'

const LEGAL_TASK_TITLES = [
  'Analisar jurisprudência aplicável',
  'Conferir documentos para protocolo',
  'Elaborar manifestação processual',
  'Preparar reunião com cliente',
  'Revisar cláusulas contratuais',
  'Validar memória de cálculo',
] as const

export const TaskFactory = factory
  .define(Task, async ({ faker }) => {
    const status = faker.helpers.arrayElement([
      'pending',
      'in_progress',
      'completed',
      'cancelled',
    ] as const)
    const dueDate = faker.datatype.boolean({ probability: 0.7 })
      ? DateTime.fromJSDate(faker.date.soon({ days: 30 }))
      : null

    return {
      title: faker.helpers.arrayElement(LEGAL_TASK_TITLES),
      description: faker.lorem.paragraph({ min: 1, max: 3 }),
      status,
      priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent'] as const),
      due_date: dueDate,
      completed_at: status === 'completed' ? DateTime.now().minus({ hours: 2 }) : null,
      tags: faker.helpers.arrayElements(
        ['contencioso', 'contratos', 'regulatório', 'tributário', 'trabalhista'],
        { min: 1, max: 3 }
      ),
      metadata: {
        estimated_hours: faker.number.int({ min: 1, max: 40 }),
        billing_rate: faker.number.int({ min: 150, max: 800 }),
        synthetic: true,
      },
      deletedAt: null,
    }
  })
  .relation('tenant', () => TenantFactory)
  .relation('process', () => ProcessFactory)
  .relation('assignee', () => UserFactory)
  .relation('creator', () => UserFactory)
  .state('urgent', (task) => {
    task.priority = 'urgent'
    task.due_date = DateTime.now().plus({ days: 1 })
  })
  .state('overdue', (task, { faker }) => {
    task.status = 'pending'
    task.due_date = DateTime.now().minus({ days: faker.number.int({ min: 1, max: 7 }) })
    task.priority = faker.helpers.arrayElement(['high', 'urgent'] as const)
    task.completed_at = null
  })
  .state('completed', (task) => {
    task.status = 'completed'
    task.completed_at = DateTime.now().minus({ hours: 1 })
  })
  .state('inProgress', (task, { faker }) => {
    task.status = 'in_progress'
    task.priority = faker.helpers.arrayElement(['medium', 'high'] as const)
    task.completed_at = null
  })
  .state('deleted', (task) => {
    task.deletedAt = DateTime.now()
  })
  .build()
