import factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'

import { ClientFactory } from '#database/factories/client_factory'
import { TenantFactory } from '#database/factories/tenant_factory'
import { UserFactory } from '#database/factories/user_factory'
import Folder from '#modules/folders/models/folder'

const LEGAL_AREAS = [
  'Administrativo',
  'Bancário',
  'Cível Contencioso',
  'Empresarial',
  'Imobiliário',
  'Regulatório',
  'Trabalhista',
  'Tributário',
] as const

export const FolderFactory = factory
  .define(Folder, async ({ faker }) => ({
    code: `PASTA-${faker.string.alphanumeric(12).toUpperCase()}`,
    title: faker.helpers.arrayElement([
      'Acompanhamento processual estratégico',
      'Consultoria regulatória',
      'Contencioso empresarial',
      'Execução de título',
      'Revisão contratual',
    ]),
    description: faker.lorem.paragraph(),
    status: faker.helpers.arrayElement([
      'active',
      'completed',
      'pending',
      'cancelled',
      'archived',
    ] as const),
    area: faker.helpers.arrayElement(LEGAL_AREAS),
    subarea: faker.datatype.boolean() ? faker.lorem.words(2) : null,
    metadata: {
      priority: faker.helpers.arrayElement(['low', 'medium', 'high']),
      complexity: faker.helpers.arrayElement(['simple', 'medium', 'complex']),
      tags: faker.helpers.arrayElements(['urgent', 'important', 'review', 'follow-up'], {
        min: 0,
        max: 3,
      }),
      synthetic: true,
    },
    deletedAt: null,
  }))
  .relation('tenant', () => TenantFactory)
  .relation('client', () => ClientFactory)
  .relation('responsible_lawyer', () => UserFactory)
  .state('active', (folder) => {
    folder.status = 'active'
  })
  .state('completed', (folder) => {
    folder.status = 'completed'
  })
  .state('pending', (folder) => {
    folder.status = 'pending'
  })
  .state('archived', (folder) => {
    folder.status = 'archived'
  })
  .state('regulatory', (folder) => {
    folder.area = 'Regulatório'
    folder.subarea = 'Sistema Financeiro'
    folder.metadata = { ...folder.metadata, regulatory: true, complexity: 'complex' }
  })
  .state('precatorio', (folder) => {
    folder.area = 'Administrativo'
    folder.subarea = 'Precatórios'
    folder.metadata = { ...folder.metadata, matter_type: 'precatorio' }
  })
  .state('deleted', (folder) => {
    folder.deletedAt = DateTime.now()
  })
  .build()
