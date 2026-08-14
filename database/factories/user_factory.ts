import factory from '@adonisjs/lucid/factories'

import { RoleFactory } from '#database/factories/role_factory'
import { TenantFactory } from '#database/factories/tenant_factory'
import User from '#modules/users/models/user'

export const FACTORY_USER_PASSWORD = 'senha123'

export const UserFactory = factory
  .define(User, async ({ faker }) => {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const suffix = faker.string.alphanumeric(10).toLowerCase()
    const verified = faker.datatype.boolean({ probability: 0.8 })

    return {
      full_name: `${firstName} ${lastName}`,
      username: `${faker.helpers.slugify(`${firstName}.${lastName}`).toLowerCase()}-${suffix}`,
      email: faker.internet
        .email({ firstName, lastName, provider: `${suffix}.example.com` })
        .toLowerCase(),
      password: FACTORY_USER_PASSWORD,
      is_deleted: false,
      metadata: {
        email_verified: verified,
        email_verification_token: null,
        email_verification_sent_at: null,
        email_verified_at: verified ? faker.date.past().toISOString() : null,
      },
    }
  })
  .relation('roles', () => RoleFactory)
  .relation('tenants', () => TenantFactory)
  .state('verified', (user, { faker }) => {
    user.metadata = {
      ...user.metadata,
      email_verified: true,
      email_verified_at: faker.date.past().toISOString(),
      email_verification_token: null,
      email_verification_sent_at: null,
    }
  })
  .state('unverified', (user) => {
    user.metadata = {
      ...user.metadata,
      email_verified: false,
      email_verified_at: null,
      email_verification_token: null,
      email_verification_sent_at: null,
    }
  })
  .state('admin', (user, { faker }) => {
    const suffix = faker.string.alphanumeric(8).toLowerCase()
    user.full_name = 'Administrador de Teste'
    user.username = `admin-${suffix}`
    user.email = `admin-${suffix}@example.com`
    user.metadata = {
      ...user.metadata,
      email_verified: true,
      email_verified_at: new Date().toISOString(),
    }
  })
  .state('lawyer', (user, { faker }) => {
    user.full_name = faker.helpers.arrayElement([
      'Dra. Ana Paula Oliveira',
      'Dr. Carlos Alberto da Silva',
      'Dra. Juliana Ferreira Lima',
      'Dr. Roberto Mendes Junior',
    ])
  })
  .state('secretary', (user, { faker }) => {
    user.full_name = faker.helpers.arrayElement([
      'Ana Maria Secretaria',
      'Marina Silva Assistente',
      'Paula Cristina Santos',
    ])
  })
  .state('intern', (user, { faker }) => {
    user.full_name = faker.helpers.arrayElement([
      'Lucia Fernanda Estagiaria',
      'Mariana Costa Estagiaria',
      'Pedro Henrique Estagiario',
    ])
  })
  .state('deleted', (user) => {
    user.is_deleted = true
  })
  .build()
