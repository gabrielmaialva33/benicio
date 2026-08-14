import factory from '@adonisjs/lucid/factories'

import IRole from '#modules/roles/interfaces/role_interface'
import Role from '#modules/roles/models/role'

const ROLE_PROFILES = {
  root: {
    name: 'Root',
    slug: IRole.Slugs.ROOT,
    description: 'Acesso irrestrito ao sistema',
  },
  admin: {
    name: 'Administrador',
    slug: IRole.Slugs.ADMIN,
    description: 'Administração da operação jurídica',
  },
  user: {
    name: 'Usuário',
    slug: IRole.Slugs.USER,
    description: 'Acesso operacional padrão',
  },
  guest: {
    name: 'Convidado',
    slug: IRole.Slugs.GUEST,
    description: 'Acesso restrito para consulta',
  },
  editor: {
    name: 'Editor',
    slug: IRole.Slugs.EDITOR,
    description: 'Edição de conteúdo permitido',
  },
} as const

function applyRole(role: Role, profile: (typeof ROLE_PROFILES)[keyof typeof ROLE_PROFILES]) {
  role.merge(profile)
}

export const RoleFactory = factory
  .define(Role, async ({ faker }) => faker.helpers.arrayElement(Object.values(ROLE_PROFILES)))
  .state('root', (role) => applyRole(role, ROLE_PROFILES.root))
  .state('admin', (role) => applyRole(role, ROLE_PROFILES.admin))
  .state('user', (role) => applyRole(role, ROLE_PROFILES.user))
  .state('guest', (role) => applyRole(role, ROLE_PROFILES.guest))
  .state('editor', (role) => applyRole(role, ROLE_PROFILES.editor))
  .build()
