import {
  PermissionActions as Actions,
  permissionName,
  PermissionResources as Resources,
} from '#permissions'
import { Bell, ContactRound, FileText, Settings, ShieldCheck, Upload, Users } from 'lucide-react'

import type { MenuSection, PageCopyRule } from './types'

/*
|--------------------------------------------------------------------------
| Navigation
|--------------------------------------------------------------------------
|
| One declaration feeding the sidebar, the command palette and the header
| copy. Permissions come from the backend enum through the `#permissions`
| alias, so renaming a resource breaks the build instead of quietly hiding a
| menu entry from everyone.
|
*/

export const MENU_SECTIONS: MenuSection[] = [
  {
    heading: 'Páginas',
    items: [
      {
        title: 'Visão Geral',
        href: '/dashboard',
        iconPath: '/yol/icons/overview.svg',
        permission: permissionName(Resources.DASHBOARD, Actions.READ),
      },
      {
        title: 'Pastas',
        href: '/folders',
        iconPath: '/yol/icons/folders.svg',
        permission: permissionName(Resources.FOLDERS, Actions.LIST),
        children: [
          {
            title: 'Cadastrar',
            href: '/folders/create',
            permission: permissionName(Resources.FOLDERS, Actions.CREATE),
          },
          {
            title: 'Consulta',
            href: '/folders',
            permission: permissionName(Resources.FOLDERS, Actions.LIST),
          },
        ],
      },
      {
        title: 'Agenda',
        href: '/calendar',
        iconPath: '/yol/icons/calendar.svg',
        permission: permissionName(Resources.HEARINGS, Actions.LIST),
      },
      {
        title: 'Notificações',
        href: '/notifications',
        icon: Bell,
        permission: permissionName(Resources.NOTIFICATIONS, Actions.LIST),
      },
      {
        title: 'Chat IA',
        href: '/chat',
        iconPath: '/yol/icons/sparkles.svg',
        permission: permissionName(Resources.AI, Actions.READ),
      },
    ],
  },
  {
    heading: 'Gestão',
    items: [
      {
        title: 'Clientes',
        href: '/clients',
        icon: ContactRound,
        permission: permissionName(Resources.CLIENTS, Actions.LIST),
      },
      {
        title: 'Usuários',
        href: '/users',
        icon: Users,
        permission: permissionName(Resources.USERS, Actions.LIST),
      },
      {
        title: 'Arquivos',
        href: '/files',
        icon: Upload,
        permission: permissionName(Resources.FILES, Actions.LIST),
      },
      {
        title: 'Papéis',
        href: '/roles',
        icon: ShieldCheck,
        permission: permissionName(Resources.ROLES, Actions.LIST),
      },
      {
        title: 'Permissões',
        href: '/permissions',
        icon: FileText,
        permission: permissionName(Resources.PERMISSIONS, Actions.LIST),
      },
      { title: 'Configurações', href: '/settings', icon: Settings },
    ],
  },
]

/**
 * Header copy per route. Ordered from most to least specific — the first match
 * wins, so `/folders/create` must come before the `/folders` prefix rule.
 */
export const PAGE_COPY_RULES: PageCopyRule[] = [
  {
    match: '/dashboard',
    title: 'Visão Geral',
    description: 'Suas tarefas principais estão nessa seção.',
  },

  // Folders and the processes nested under them
  {
    match: '/folders/create',
    title: 'Cadastro de Pasta',
    description: 'Preencha os dados da nova pasta.',
    breadcrumb: [{ label: 'Pastas', href: '/folders' }],
  },
  {
    match: /^\/folders\/\d+\/processes\/create$/,
    title: 'Novo Processo',
    description: 'Cadastre o processo dentro da pasta.',
    breadcrumb: [{ label: 'Pastas', href: '/folders' }],
  },
  {
    match: /^\/folders\/\d+\/processes\/\d+\/edit$/,
    title: 'Editar Processo',
    description: 'Atualize dados, valores e partes.',
    breadcrumb: [{ label: 'Pastas', href: '/folders' }],
  },
  {
    match: /^\/folders\/\d+\/processes\/\d+$/,
    title: 'Detalhes do Processo',
    description: 'Consulte o contexto processual completo.',
    breadcrumb: [{ label: 'Pastas', href: '/folders' }],
  },
  {
    match: /^\/folders\/\d+$/,
    title: 'Detalhes da Pasta',
    description: 'Acompanhe o contexto jurídico e operacional.',
    breadcrumb: [{ label: 'Pastas', href: '/folders' }],
  },
  { match: '/folders', title: 'Consulta de pastas', description: 'Pastas › Consulta' },

  // Clients
  {
    match: '/clients/create',
    title: 'Novo Cliente',
    description: 'Cadastre uma pessoa física ou jurídica.',
    breadcrumb: [{ label: 'Clientes', href: '/clients' }],
  },
  {
    match: /^\/clients\/\d+\/edit$/,
    title: 'Editar Cliente',
    description: 'Atualize os dados cadastrais e de contato.',
    breadcrumb: [{ label: 'Clientes', href: '/clients' }],
  },
  {
    match: /^\/clients\/\d+$/,
    title: 'Detalhes do Cliente',
    description: 'Consulte dados e vínculos jurídicos.',
    breadcrumb: [{ label: 'Clientes', href: '/clients' }],
  },
  {
    match: '/clients',
    title: 'Clientes',
    description: 'Gerencie a base de clientes do escritório.',
  },

  { match: '/calendar', title: 'Agenda', description: 'Audiências e prazos do escritório.' },
  { match: '/notifications', title: 'Notificações', description: 'Tudo que pediu sua atenção.' },
  { match: '/chat', title: 'Chat IA', description: 'Seu assistente jurídico inteligente.' },
  {
    match: '/users',
    title: 'Usuários',
    description: 'Gerencie as pessoas com acesso à plataforma.',
  },
  {
    match: '/files',
    title: 'Arquivos',
    description: 'Envie e organize os documentos do escritório.',
  },
  { match: '/roles', title: 'Papéis', description: 'Organize os níveis de acesso da equipe.' },
  {
    match: '/permissions',
    title: 'Permissões',
    description: 'Consulte as capacidades disponíveis no sistema.',
  },
  {
    match: '/settings',
    title: 'Configurações',
    description: 'Ajuste seu perfil e o escritório ativo.',
  },
]

export const FALLBACK_PAGE_COPY = {
  title: 'Benício',
  description: 'Gestão jurídica em um só lugar.',
}
