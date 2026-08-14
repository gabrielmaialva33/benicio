import type { LegalDemoClientKey, LegalDemoUserKey } from '#database/fixtures/legal_demo'

export const legalDemoSpecialPermissions = [
  ['folders.archive', 'folders', 'archive', 'Arquivar pastas'],
  ['folders.unarchive', 'folders', 'unarchive', 'Desarquivar pastas'],
  ['folders.assign', 'folders', 'assign', 'Atribuir pastas a responsáveis'],
  ['folders.status_change', 'folders', 'status_change', 'Alterar status de pastas'],
  ['documents.sign', 'documents', 'sign', 'Assinar documentos'],
  ['documents.version', 'documents', 'version', 'Versionar documentos'],
  ['documents.approve', 'documents', 'approve', 'Aprovar documentos'],
  ['hearings.schedule', 'hearings', 'schedule', 'Agendar audiências'],
  ['hearings.reschedule', 'hearings', 'reschedule', 'Reagendar audiências'],
  ['hearings.cancel', 'hearings', 'cancel', 'Cancelar audiências'],
  ['tasks.assign', 'tasks', 'assign', 'Atribuir tarefas'],
  ['tasks.complete', 'tasks', 'complete', 'Concluir tarefas'],
  ['messages.send', 'messages', 'send', 'Enviar mensagens'],
  ['messages.broadcast', 'messages', 'broadcast', 'Transmitir mensagens'],
  ['notifications.send', 'notifications', 'send', 'Enviar notificações'],
  ['notifications.manage', 'notifications', 'manage', 'Gerenciar notificações'],
  ['dashboard.view', 'dashboard', 'view', 'Visualizar dashboard'],
  ['analytics.view', 'analytics', 'view', 'Visualizar análises'],
  ['analytics.export', 'analytics', 'export', 'Exportar análises'],
  ['system.backup', 'system', 'backup', 'Executar backup'],
  ['system.maintenance', 'system', 'maintenance', 'Executar manutenção'],
] as const

export const legalDemoRolePermissionNames = {
  root: legalDemoSpecialPermissions.map(([name]) => name),
  admin: legalDemoSpecialPermissions
    .map(([name]) => name)
    .filter((name) => !name.startsWith('system.')),
  editor: [
    'folders.archive',
    'folders.unarchive',
    'folders.assign',
    'folders.status_change',
    'documents.sign',
    'documents.version',
    'documents.approve',
    'hearings.schedule',
    'hearings.reschedule',
    'tasks.assign',
    'tasks.complete',
    'messages.send',
    'analytics.view',
    'dashboard.view',
  ],
  user: [
    'folders.status_change',
    'documents.version',
    'hearings.schedule',
    'hearings.reschedule',
    'tasks.assign',
    'tasks.complete',
    'messages.send',
    'notifications.send',
    'dashboard.view',
  ],
  guest: ['dashboard.view'],
} as const

export const legalDemoDirectPermissions: Record<LegalDemoUserKey, readonly string[]> = {
  admin: [],
  benicio: ['system.backup', 'analytics.export', 'reports.export'],
  andre: ['analytics.view', 'analytics.export', 'folders.archive'],
  marcos: [],
  patricia: [],
  mariana: [],
  fernanda: [],
  pedro: [],
  julia: [],
  test: [],
}

interface DemoStandaloneFileFixture {
  file_name: string
  client: LegalDemoClientKey
  owner: LegalDemoUserKey
  category: string
}

export const legalDemoStandaloneFiles: DemoStandaloneFileFixture[] = [
  {
    file_name: 'contrato-bancario-inter.md',
    client: 'bancoInter',
    owner: 'andre',
    category: 'contract',
  },
  {
    file_name: 'peticao-inicial-zurich.md',
    client: 'zurich',
    owner: 'marcos',
    category: 'petition',
  },
  {
    file_name: 'laudo-pericial-sinistro.md',
    client: 'zurich',
    owner: 'marcos',
    category: 'evidence',
  },
  {
    file_name: 'acordao-trt24-veiculos.md',
    client: 'muitoMais',
    owner: 'marcos',
    category: 'decision',
  },
  {
    file_name: 'planilha-calculos-trabalhistas.md',
    client: 'muitoMais',
    owner: 'mariana',
    category: 'other',
  },
  {
    file_name: 'fotos-acidente-veiculo.md',
    client: 'carlos',
    owner: 'pedro',
    category: 'evidence',
  },
  {
    file_name: 'carta-citacao-correios.md',
    client: 'correios',
    owner: 'patricia',
    category: 'correspondence',
  },
  {
    file_name: 'cci-conjunto-residencial.md',
    client: 'caixa',
    owner: 'patricia',
    category: 'contract',
  },
  {
    file_name: 'notas-fiscais-gallo.md',
    client: 'gallo',
    owner: 'andre',
    category: 'other',
  },
  {
    file_name: 'parecer-juridico-cripto.md',
    client: 'bancoInter',
    owner: 'andre',
    category: 'other',
  },
  {
    file_name: 'manifestacao-bcb-open-finance.md',
    client: 'bancoInter',
    owner: 'benicio',
    category: 'correspondence',
  },
  {
    file_name: 'certidao-demonstrativa.md',
    client: 'carlos',
    owner: 'mariana',
    category: 'other',
  },
  {
    file_name: 'comprovante-endereco-demonstrativo.md',
    client: 'carlos',
    owner: 'fernanda',
    category: 'evidence',
  },
  {
    file_name: 'ata-reuniao-diretoria.md',
    client: 'bancoInter',
    owner: 'benicio',
    category: 'other',
  },
  {
    file_name: 'balanco-patrimonial-demonstrativo.md',
    client: 'gallo',
    owner: 'julia',
    category: 'other',
  },
]

export const legalDemoTokenUsers: LegalDemoUserKey[] = [
  'benicio',
  'andre',
  'marcos',
  'patricia',
  'mariana',
  'fernanda',
  'pedro',
  'julia',
]

export const legalDemoRateLimits = [
  ['api:global', 1000, 3600],
  ['api:user:1', 100, 3600],
  ['api:user:2', 150, 3600],
  ['api:user:3', 120, 3600],
  ['login:ip:192.0.2.100', 5, 900],
  ['login:ip:192.0.2.101', 3, 900],
  ['login:ip:192.0.2.102', 2, 900],
  ['upload:user:1', 50, 3600],
  ['upload:user:2', 30, 3600],
  ['upload:user:3', 25, 3600],
  ['search:user:1', 200, 3600],
  ['search:user:2', 100, 3600],
  ['email:system', 500, 3600],
  ['email:user:1', 20, 3600],
  ['email:user:2', 15, 3600],
] as const
