/**
 * Portuguese labels for the permission vocabulary.
 *
 * `resource` and `action` are database slugs, so the roles and permissions
 * screens were showing raw English identifiers (`status_change`, `unarchive`)
 * to lawyers and administrators. The slug stays the value everywhere in code;
 * only what reaches the screen is translated.
 *
 * Unknown slugs fall back to a humanised version of the slug rather than
 * disappearing: a permission with no label is still a permission someone
 * needs to see.
 */
const RESOURCE_LABELS: Record<string, string> = {
  ai: 'IA',
  analytics: 'Análises',
  audit: 'Auditoria',
  clients: 'Clientes',
  dashboard: 'Visão geral',
  deadlines: 'Prazos',
  documents: 'Documentos',
  files: 'Arquivos',
  folders: 'Pastas',
  hearings: 'Audiências',
  messages: 'Mensagens',
  movements: 'Movimentações',
  notifications: 'Notificações',
  permissions: 'Permissões',
  processes: 'Processos',
  reports: 'Relatórios',
  roles: 'Papéis',
  settings: 'Configurações',
  system: 'Sistema',
  tasks: 'Tarefas',
  users: 'Usuários',
}

const ACTION_LABELS: Record<string, string> = {
  approve: 'aprovar',
  archive: 'arquivar',
  assign: 'atribuir',
  backup: 'backup',
  broadcast: 'transmitir',
  cancel: 'cancelar',
  complete: 'concluir',
  create: 'criar',
  delete: 'excluir',
  export: 'exportar',
  import: 'importar',
  list: 'listar',
  maintenance: 'manutenção',
  manage: 'gerenciar',
  read: 'ver',
  reschedule: 'reagendar',
  revoke: 'revogar',
  schedule: 'agendar',
  send: 'enviar',
  sign: 'assinar',
  status_change: 'mudar status',
  unarchive: 'desarquivar',
  update: 'editar',
  version: 'versionar',
  view: 'visualizar',
}

/** `status_change` reads as "Status change" rather than vanishing. */
function humanize(slug: string): string {
  const words = slug.replaceAll('_', ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function resourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource.toLowerCase()] ?? humanize(resource)
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action.toLowerCase()] ?? humanize(action)
}

/** Contexts narrow a grant ("own", "team"); `any` is the unrestricted default. */
const CONTEXT_LABELS: Record<string, string> = {
  own: 'próprios',
  team: 'equipe',
  department: 'departamento',
}

export function contextLabel(context: string): string {
  return CONTEXT_LABELS[context.toLowerCase()] ?? humanize(context)
}
