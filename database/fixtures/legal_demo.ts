import type { ClientAddress, ClientPersonType } from '#modules/clients/interfaces/client_interface'
import type {
  DeadlineKind,
  DeadlinePriority,
} from '#modules/deadlines/interfaces/deadline_interface'
import type { FolderStatus } from '#modules/folders/interfaces/folder_interface'
import type { HearingType } from '#modules/hearings/interfaces/hearing_interface'
import type {
  ProcessDistributionType,
  ProcessInstance,
  ProcessPartyPersonType,
  ProcessPartySide,
  ProcessPhase,
  ProcessStatus,
} from '#modules/processes/interfaces/process_interface'
import type { TaskPriority, TaskStatus } from '#modules/tasks/interfaces/task_interface'

/** Stable marker used to identify records managed by the development fixture. */
export const LEGAL_DEMO_SEED_KEY = 'benicio-legal-demo-v2'

/** Password intentionally shared only by local development fixture accounts. */
export const LEGAL_DEMO_PASSWORD = 'benicio123'

/**
 * A fixed clock makes the fixture reproducible and keeps civil dates independent
 * from the machine timezone. Move this date intentionally when refreshing the demo.
 */
export const LEGAL_DEMO_REFERENCE_DATE = '2026-08-14T09:00:00-03:00'

export const legalDemoTenant = {
  name: 'Benício Advogados',
  slug: 'benicio-advogados',
  is_active: true,
} as const

type DemoTenantRole = 'owner' | 'admin' | 'member'
type DemoSystemRole = 'root' | 'admin' | 'user'

interface DemoUserFixture {
  full_name: string
  email: string
  username: string
  tenantRole: DemoTenantRole
  systemRoles: DemoSystemRole[]
}

export const legalDemoUsers = {
  admin: {
    full_name: 'Administrador do Sistema',
    email: 'admin@benicio.com.br',
    username: 'admin',
    tenantRole: 'owner',
    systemRoles: ['root', 'user'],
  },
  benicio: {
    full_name: 'Dr. Benedicto Celso Benício',
    email: 'benedicto.benicio@benicio.com.br',
    username: 'benedicto.benicio',
    tenantRole: 'admin',
    systemRoles: ['admin', 'user'],
  },
  andre: {
    full_name: 'Dr. André Câmara',
    email: 'andre.camara@benicio.com.br',
    username: 'andre.camara',
    tenantRole: 'member',
    systemRoles: ['user'],
  },
  marcos: {
    full_name: 'Dr. Marcos Lemos',
    email: 'marcos.lemos@benicio.com.br',
    username: 'marcos.lemos',
    tenantRole: 'member',
    systemRoles: ['user'],
  },
  patricia: {
    full_name: 'Dra. Patrícia Silva',
    email: 'patricia.silva@benicio.com.br',
    username: 'patricia.silva',
    tenantRole: 'member',
    systemRoles: ['user'],
  },
  mariana: {
    full_name: 'Mariana Costa',
    email: 'mariana.costa@benicio.com.br',
    username: 'mariana.costa',
    tenantRole: 'member',
    systemRoles: ['user'],
  },
  fernanda: {
    full_name: 'Fernanda Santos',
    email: 'fernanda.santos@benicio.com.br',
    username: 'fernanda.santos',
    tenantRole: 'member',
    systemRoles: ['user'],
  },
  pedro: {
    full_name: 'Pedro Henrique Oliveira',
    email: 'pedro.henrique@benicio.com.br',
    username: 'pedro.henrique',
    tenantRole: 'member',
    systemRoles: ['user'],
  },
  julia: {
    full_name: 'Julia Martins',
    email: 'julia.martins@benicio.com.br',
    username: 'julia.martins',
    tenantRole: 'member',
    systemRoles: ['user'],
  },
} as const satisfies Record<string, DemoUserFixture>

export type LegalDemoUserKey = keyof typeof legalDemoUsers

interface DemoClientFixture {
  name: string
  document: string
  person_type: ClientPersonType
  email: string
  phone: string
  address: ClientAddress
  notes: string
  metadata: Record<string, unknown>
}

export const legalDemoClients = {
  bancoInter: {
    name: 'Banco Inter S.A.',
    document: '00416968000101',
    person_type: 'company',
    email: 'juridico@bancointer.example',
    phone: '(31) 3003-4070',
    address: {
      street: 'Av. Barbacena',
      number: '1219',
      neighborhood: 'Santo Agostinho',
      city: 'Belo Horizonte',
      state: 'MG',
      postal_code: '30190-131',
      country: 'BR',
    },
    notes: 'Cenário demonstrativo: instituição financeira digital.',
    metadata: { sector: 'Serviços financeiros', size: 'large' },
  },
  zurich: {
    name: 'Zurich Minas Brasil Seguros S.A.',
    document: '17197385000121',
    person_type: 'company',
    email: 'juridico@zurich.example',
    phone: '(11) 3133-0000',
    address: {
      street: 'Av. Jornalista Roberto Marinho',
      number: '85',
      neighborhood: 'Brooklin',
      city: 'São Paulo',
      state: 'SP',
      postal_code: '04576-010',
      country: 'BR',
    },
    notes: 'Cenário demonstrativo: seguradora multinacional.',
    metadata: { sector: 'Seguros', size: 'large' },
  },
  gallo: {
    name: 'Gallo Ferreira Comércio de Frutas Ltda.',
    document: '08123456000199',
    person_type: 'company',
    email: 'contato@galloferreira.example',
    phone: '(11) 4123-5678',
    address: {
      street: 'CEAGESP - Pavilhão MLP',
      number: 'Box 123',
      neighborhood: 'Vila Leopoldina',
      city: 'São Paulo',
      state: 'SP',
      postal_code: '05429-000',
      country: 'BR',
    },
    notes: 'Cenário demonstrativo: distribuidora de alimentos.',
    metadata: { sector: 'Agronegócio', size: 'medium' },
  },
  carlos: {
    name: 'Carlos Ulisses Parente',
    document: '12345678900',
    person_type: 'individual',
    email: 'carlos.parente@example.com',
    phone: '(21) 98765-4321',
    address: {
      street: 'Rua Visconde de Pirajá',
      number: '550',
      complement: 'Apto. 801',
      neighborhood: 'Ipanema',
      city: 'Rio de Janeiro',
      state: 'RJ',
      postal_code: '22410-002',
      country: 'BR',
    },
    notes: 'Pessoa fictícia preservada apenas como cenário demonstrativo.',
    metadata: { profession: 'Empresário', synthetic: true },
  },
  muitoMais: {
    name: 'I.B.S. de Souza Muito+ Modas Ltda.',
    document: '15789456000123',
    person_type: 'company',
    email: 'contato@muitomais.example',
    phone: '(67) 3321-1234',
    address: {
      street: 'Rua 14 de Julho',
      number: '2345',
      neighborhood: 'Centro',
      city: 'Campo Grande',
      state: 'MS',
      postal_code: '79002-333',
      country: 'BR',
    },
    notes: 'Cenário demonstrativo: comércio varejista.',
    metadata: { sector: 'Varejo', size: 'small' },
  },
  correios: {
    name: 'Empresa Brasileira de Correios e Telégrafos',
    document: '34028316000103',
    person_type: 'company',
    email: 'juridico@correios.example',
    phone: '(61) 3003-0100',
    address: {
      street: 'SBN Quadra 1 Bloco A',
      number: 'Ed. Sede ECT',
      neighborhood: 'Asa Norte',
      city: 'Brasília',
      state: 'DF',
      postal_code: '70002-900',
      country: 'BR',
    },
    notes: 'Cenário demonstrativo: empresa pública federal.',
    metadata: { sector: 'Serviços públicos', size: 'large' },
  },
  caixa: {
    name: 'Caixa Econômica Federal',
    document: '00360305000104',
    person_type: 'company',
    email: 'juridico@caixa.example',
    phone: '(61) 3206-9000',
    address: {
      street: 'SBS Quadra 4 Bloco A',
      number: 'Lote 3/4',
      neighborhood: 'Asa Sul',
      city: 'Brasília',
      state: 'DF',
      postal_code: '70092-900',
      country: 'BR',
    },
    notes: 'Cenário demonstrativo: instituição financeira pública.',
    metadata: { sector: 'Bancário', size: 'large' },
  },
  vanessa: {
    name: 'Vanessa Cavalcanti Bizerra',
    document: '98765432100',
    person_type: 'individual',
    email: 'vanessa.bizerra@example.com',
    phone: '(11) 97654-3210',
    address: {
      street: 'Alameda Santos',
      number: '1234',
      complement: 'Sala 1502',
      neighborhood: 'Jardim Paulista',
      city: 'São Paulo',
      state: 'SP',
      postal_code: '01419-002',
      country: 'BR',
    },
    notes: 'Pessoa fictícia preservada apenas como cenário demonstrativo.',
    metadata: { profession: 'Consultora', synthetic: true },
  },
} as const satisfies Record<string, DemoClientFixture>

export type LegalDemoClientKey = keyof typeof legalDemoClients

interface DemoFolderFixture {
  code: string
  title: string
  description: string
  status: FolderStatus
  area: string
  subarea: string
  client: LegalDemoClientKey
  responsible: LegalDemoUserKey
  metadata: Record<string, unknown>
}

export const legalDemoFolders = {
  crypto: {
    code: 'PROC-2024-001',
    title: 'Banco Inter - Regulamentação de criptoativos',
    description: 'Assessoria para adequação regulatória de serviços com ativos virtuais.',
    status: 'active',
    area: 'Regulatório',
    subarea: 'Sistema financeiro',
    client: 'bancoInter',
    responsible: 'andre',
    metadata: { priority: 'high', complexity: 'high', regulatory: true },
  },
  zurichConflict: {
    code: 'PROC-2024-002',
    title: 'Zurich Seguros - Conflito de competência',
    description: 'Discussão de competência entre varas cíveis do Rio de Janeiro.',
    status: 'active',
    area: 'Contencioso Cível',
    subarea: 'Seguros',
    client: 'zurich',
    responsible: 'marcos',
    metadata: { priority: 'high', claim_number: 'ZUR-DEMO-0098' },
  },
  vehicleUsage: {
    code: 'PROC-2022-079',
    title: 'Uso de veículo próprio em atividade profissional',
    description: 'Discussão trabalhista sobre ressarcimento pelo uso de veículo particular.',
    status: 'completed',
    area: 'Trabalhista',
    subarea: 'Indenização',
    client: 'muitoMais',
    responsible: 'marcos',
    metadata: { result: 'unfavorable', appeal: 'completed' },
  },
  carf: {
    code: 'PROC-2016-033',
    title: 'Processo administrativo fiscal - CARF',
    description: 'Acompanhamento de defesa em processo administrativo fiscal.',
    status: 'completed',
    area: 'Tributário',
    subarea: 'Contencioso administrativo',
    client: 'bancoInter',
    responsible: 'benicio',
    metadata: { complexity: 'high', synthetic: true },
  },
  correiosLabor: {
    code: 'PROC-2023-045',
    title: 'ECT - Reclamação trabalhista',
    description: 'Defesa em reclamação trabalhista envolvendo demissão por justa causa.',
    status: 'active',
    area: 'Trabalhista',
    subarea: 'Contencioso',
    client: 'correios',
    responsible: 'patricia',
    metadata: { employment_duration_years: 8 },
  },
  caixaMortgage: {
    code: 'PROC-2024-067',
    title: 'CEF - Execução de garantia hipotecária',
    description: 'Execução de garantia por inadimplência em financiamento habitacional.',
    status: 'active',
    area: 'Imobiliário',
    subarea: 'Execução',
    client: 'caixa',
    responsible: 'patricia',
    metadata: { property_units: 50, appraisal_value: 2650000 },
  },
  galloCollection: {
    code: 'PROC-2024-089',
    title: 'Gallo Ferreira - Cobrança comercial',
    description: 'Cobrança por fornecimento de mercadorias não quitado.',
    status: 'active',
    area: 'Contencioso Cível',
    subarea: 'Cobrança',
    client: 'gallo',
    responsible: 'andre',
    metadata: { total_invoices: 24, unpaid_months: 6 },
  },
  openFinance: {
    code: 'PROC-2024-102',
    title: 'Banco Inter - Implementação de Open Finance',
    description: 'Assessoria regulatória para compartilhamento de dados e pagamentos instantâneos.',
    status: 'pending',
    area: 'Regulatório',
    subarea: 'Open Finance',
    client: 'bancoInter',
    responsible: 'andre',
    metadata: { project_phase: 3, regulatory: true },
  },
} as const satisfies Record<string, DemoFolderFixture>

export type LegalDemoFolderKey = keyof typeof legalDemoFolders

interface DemoCounterpartyFixture {
  side: ProcessPartySide
  role: string
  name: string
  document: string | null
  person_type: ProcessPartyPersonType | null
}

interface DemoProcessFixture {
  folder: LegalDemoFolderKey
  cnj_number: string | null
  legacy_number: string | null
  internal_code: string
  status: ProcessStatus
  instance: ProcessInstance
  phase: ProcessPhase
  distribution_type: ProcessDistributionType
  electronic: boolean
  nature: string
  action_type: string
  tribunal: string
  judicial_body: string | null
  district: string | null
  court_division: string | null
  judge: string | null
  case_value: string
  conviction_value: string | null
  costs: string | null
  fees: string | null
  distribution_date: string
  citation_date: string | null
  entry_date: string
  observation: string
  object_detail: string
  clientSide: ProcessPartySide
  clientRole: string
  counterparty: DemoCounterpartyFixture
  metadata: Record<string, unknown>
}

export const legalDemoProcesses = {
  crypto: {
    folder: 'crypto',
    cnj_number: null,
    legacy_number: 'CP-109/2024-BCB',
    internal_code: 'INT-2024-001',
    status: 'active',
    instance: 'first',
    phase: 'knowledge',
    distribution_type: 'lottery',
    electronic: true,
    nature: 'Administrativa',
    action_type: 'Consulta regulatória',
    tribunal: 'Banco Central do Brasil',
    judicial_body: 'Diretoria de Regulação',
    district: 'Brasília',
    court_division: null,
    judge: null,
    case_value: '5000000.00',
    conviction_value: null,
    costs: null,
    fees: '500000.00',
    distribution_date: '2024-01-15',
    citation_date: null,
    entry_date: '2024-01-15',
    observation: 'Consulta regulatória em acompanhamento.',
    object_detail: 'Adequação regulatória para operação com ativos virtuais.',
    clientSide: 'active',
    clientRole: 'Interessado',
    counterparty: {
      side: 'passive',
      role: 'Órgão regulador',
      name: 'Banco Central do Brasil',
      document: null,
      person_type: 'company',
    },
    metadata: { source_reference: 'legacy-realistic:crypto' },
  },
  zurichConflict: {
    folder: 'zurichConflict',
    cnj_number: '08382093620248190203',
    legacy_number: null,
    internal_code: 'INT-2024-002',
    status: 'active',
    instance: 'second',
    phase: 'appeal',
    distribution_type: 'dependency',
    electronic: true,
    nature: 'Cível',
    action_type: 'Conflito de competência',
    tribunal: 'TJRJ',
    judicial_body: '21ª Câmara Cível',
    district: 'Rio de Janeiro',
    court_division: null,
    judge: 'Des. Luiz Umpierre de Mello Serra',
    case_value: '850000.00',
    conviction_value: '425000.00',
    costs: '15000.00',
    fees: '85000.00',
    distribution_date: '2024-03-10',
    citation_date: '2024-03-25',
    entry_date: '2024-03-10',
    observation: 'Autos conclusos para decisão.',
    object_detail: 'Cobrança securitária decorrente de sinistro veicular.',
    clientSide: 'active',
    clientRole: 'Requerente',
    counterparty: {
      side: 'passive',
      role: 'Requerido',
      name: 'Carlos Ulisses Parente',
      document: '12345678900',
      person_type: 'individual',
    },
    metadata: { source_reference: 'legacy-realistic:zurich-conflict' },
  },
  vehicleUsage: {
    folder: 'vehicleUsage',
    cnj_number: '00245197920225240000',
    legacy_number: null,
    internal_code: 'INT-2022-079',
    status: 'closed',
    instance: 'superior',
    phase: 'appeal',
    distribution_type: 'lottery',
    electronic: true,
    nature: 'Trabalhista',
    action_type: 'Incidente de uniformização',
    tribunal: 'TRT24',
    judicial_body: 'Tribunal Pleno',
    district: 'Campo Grande',
    court_division: null,
    judge: 'Des. João Marcelo Balsanelli',
    case_value: '132690.00',
    conviction_value: '132690.00',
    costs: '5000.00',
    fees: '13269.00',
    distribution_date: '2022-10-04',
    citation_date: '2022-10-20',
    entry_date: '2022-10-04',
    observation: 'Julgamento encerrado no cenário demonstrativo.',
    object_detail: 'Ressarcimento pelo uso de veículo particular em atividade profissional.',
    clientSide: 'passive',
    clientRole: 'Reclamada',
    counterparty: {
      side: 'active',
      role: 'Reclamante',
      name: 'Vanessa Cavalcanti Bizerra',
      document: '98765432100',
      person_type: 'individual',
    },
    metadata: { source_reference: 'legacy-realistic:vehicle-usage' },
  },
  carf: {
    folder: 'carf',
    cnj_number: null,
    legacy_number: '0001234-56.2016.4.03.6100',
    internal_code: 'INT-2016-033',
    status: 'closed',
    instance: 'first',
    phase: 'knowledge',
    distribution_type: 'dependency',
    electronic: true,
    nature: 'Tributária',
    action_type: 'Processo administrativo fiscal',
    tribunal: 'CARF',
    judicial_body: 'Conselho Administrativo de Recursos Fiscais',
    district: 'Brasília',
    court_division: null,
    judge: null,
    case_value: '10000000.00',
    conviction_value: null,
    costs: null,
    fees: '650000.00',
    distribution_date: '2016-05-03',
    citation_date: '2016-05-20',
    entry_date: '2016-05-03',
    observation: 'Cenário anonimizado e sem alegação sobre fatos reais.',
    object_detail: 'Defesa em procedimento administrativo fiscal complexo.',
    clientSide: 'passive',
    clientRole: 'Contribuinte',
    counterparty: {
      side: 'active',
      role: 'Autoridade fiscal',
      name: 'União Federal',
      document: null,
      person_type: 'company',
    },
    metadata: { source_reference: 'legacy-realistic:carf', synthetic: true },
  },
  correiosLabor: {
    folder: 'correiosLabor',
    cnj_number: null,
    legacy_number: '1000123-45.2023.5.02.0001',
    internal_code: 'INT-2023-045',
    status: 'active',
    instance: 'first',
    phase: 'knowledge',
    distribution_type: 'lottery',
    electronic: true,
    nature: 'Trabalhista',
    action_type: 'Reclamação trabalhista',
    tribunal: 'TRT2',
    judicial_body: 'Vara do Trabalho',
    district: 'São Paulo',
    court_division: '1ª Vara do Trabalho',
    judge: 'Dr. Fernando Costa',
    case_value: '245000.00',
    conviction_value: null,
    costs: '8000.00',
    fees: '24500.00',
    distribution_date: '2023-06-15',
    citation_date: '2023-07-01',
    entry_date: '2023-06-15',
    observation: 'Contestação protocolada; aguardando instrução.',
    object_detail: 'Discussão sobre justa causa, verbas rescisórias e danos morais.',
    clientSide: 'passive',
    clientRole: 'Reclamada',
    counterparty: {
      side: 'active',
      role: 'Reclamante',
      name: 'Adilson Santos Augusto',
      document: null,
      person_type: 'individual',
    },
    metadata: { source_reference: 'legacy-realistic:correios-labor' },
  },
  caixaMortgage: {
    folder: 'caixaMortgage',
    cnj_number: null,
    legacy_number: '1005678-90.2024.8.26.0100',
    internal_code: 'INT-2024-067',
    status: 'active',
    instance: 'first',
    phase: 'execution',
    distribution_type: 'lottery',
    electronic: true,
    nature: 'Cível',
    action_type: 'Execução de garantia hipotecária',
    tribunal: 'TJSP',
    judicial_body: 'Foro Central Cível',
    district: 'São Paulo',
    court_division: '15ª Vara Cível',
    judge: null,
    case_value: '2500000.00',
    conviction_value: null,
    costs: '25000.00',
    fees: '125000.00',
    distribution_date: '2024-02-20',
    citation_date: '2024-03-05',
    entry_date: '2024-02-20',
    observation: 'Bem avaliado; aguardando atos expropriatórios.',
    object_detail: 'Execução de cédula de crédito imobiliário.',
    clientSide: 'active',
    clientRole: 'Exequente',
    counterparty: {
      side: 'passive',
      role: 'Executado',
      name: 'Conjunto Residencial Vila Nova',
      document: null,
      person_type: 'company',
    },
    metadata: { source_reference: 'legacy-realistic:caixa-mortgage' },
  },
  galloCollection: {
    folder: 'galloCollection',
    cnj_number: null,
    legacy_number: '1009876-54.2024.8.26.0100',
    internal_code: 'INT-2024-089',
    status: 'active',
    instance: 'first',
    phase: 'knowledge',
    distribution_type: 'lottery',
    electronic: true,
    nature: 'Cível',
    action_type: 'Ação de cobrança',
    tribunal: 'TJSP',
    judicial_body: 'Foro Central Cível',
    district: 'São Paulo',
    court_division: '8ª Vara Cível',
    judge: null,
    case_value: '487000.00',
    conviction_value: null,
    costs: '10000.00',
    fees: '48700.00',
    distribution_date: '2024-04-10',
    citation_date: '2024-04-25',
    entry_date: '2024-04-10',
    observation: 'Tutela cautelar deferida no cenário demonstrativo.',
    object_detail: 'Cobrança de faturas comerciais inadimplidas.',
    clientSide: 'active',
    clientRole: 'Autora',
    counterparty: {
      side: 'passive',
      role: 'Ré',
      name: 'Supermercados União Ltda.',
      document: null,
      person_type: 'company',
    },
    metadata: { source_reference: 'legacy-realistic:gallo-collection' },
  },
  openFinance: {
    folder: 'openFinance',
    cnj_number: null,
    legacy_number: 'REG-2024-0156',
    internal_code: 'INT-2024-102',
    status: 'suspended',
    instance: 'first',
    phase: 'knowledge',
    distribution_type: 'dependency',
    electronic: true,
    nature: 'Administrativa',
    action_type: 'Assessoria regulatória',
    tribunal: 'Banco Central do Brasil',
    judicial_body: 'Departamento de Regulação',
    district: 'Brasília',
    court_division: null,
    judge: null,
    case_value: '3000000.00',
    conviction_value: null,
    costs: null,
    fees: '300000.00',
    distribution_date: '2024-05-01',
    citation_date: null,
    entry_date: '2024-05-01',
    observation: 'Projeto aguardando próxima fase regulatória.',
    object_detail: 'Adequação a requisitos de Open Finance e pagamentos instantâneos.',
    clientSide: 'active',
    clientRole: 'Instituição participante',
    counterparty: {
      side: 'passive',
      role: 'Órgão regulador',
      name: 'Banco Central do Brasil',
      document: null,
      person_type: 'company',
    },
    metadata: { source_reference: 'legacy-realistic:open-finance' },
  },
} as const satisfies Record<string, DemoProcessFixture>

export type LegalDemoProcessKey = keyof typeof legalDemoProcesses

interface DemoTaskFixture {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueOffsetDays: number
  completedOffsetDays?: number
  folder: LegalDemoFolderKey
  process: LegalDemoProcessKey
  assignee: LegalDemoUserKey
  creator: LegalDemoUserKey
  tags: string[]
  metadata: Record<string, unknown>
}

export const legalDemoTasks: DemoTaskFixture[] = [
  {
    title: 'Finalizar resposta à consulta regulatória',
    description: 'Consolidar parecer técnico e revisão do time de compliance.',
    status: 'in_progress',
    priority: 'high',
    dueOffsetDays: 7,
    folder: 'crypto',
    process: 'crypto',
    assignee: 'andre',
    creator: 'benicio',
    tags: ['regulatório', 'prioridade'],
    metadata: { estimated_hours: 40 },
  },
  {
    title: 'Preparar audiência de instrução',
    description: 'Revisar documentos e alinhar as testemunhas do caso trabalhista.',
    status: 'pending',
    priority: 'urgent',
    dueOffsetDays: 3,
    folder: 'correiosLabor',
    process: 'correiosLabor',
    assignee: 'patricia',
    creator: 'marcos',
    tags: ['audiência', 'trabalhista'],
    metadata: { witnesses: 3 },
  },
  {
    title: 'Elaborar memorial do conflito de competência',
    description: 'Preparar memorial sintético para a sessão de julgamento.',
    status: 'pending',
    priority: 'medium',
    dueOffsetDays: 12,
    folder: 'zurichConflict',
    process: 'zurichConflict',
    assignee: 'marcos',
    creator: 'benicio',
    tags: ['memorial', 'cível'],
    metadata: { pages_limit: 20 },
  },
  {
    title: 'Acompanhar atos expropriatórios',
    description: 'Conferir edital e condições do leilão judicial.',
    status: 'pending',
    priority: 'high',
    dueOffsetDays: 18,
    folder: 'caixaMortgage',
    process: 'caixaMortgage',
    assignee: 'patricia',
    creator: 'admin',
    tags: ['execução', 'imobiliário'],
    metadata: { minimum_bid: 1750000 },
  },
  {
    title: 'Revisar contratos de Open Finance',
    description: 'Concluir a revisão dos instrumentos de compartilhamento de dados.',
    status: 'completed',
    priority: 'medium',
    dueOffsetDays: -5,
    completedOffsetDays: -4,
    folder: 'openFinance',
    process: 'openFinance',
    assignee: 'andre',
    creator: 'benicio',
    tags: ['contratos', 'open-finance'],
    metadata: { contracts_reviewed: 15 },
  },
  {
    title: 'Protocolar manifestação sobre o acórdão',
    description: 'Juntar ciência e atualizar o encerramento do caso trabalhista.',
    status: 'completed',
    priority: 'high',
    dueOffsetDays: -30,
    completedOffsetDays: -29,
    folder: 'vehicleUsage',
    process: 'vehicleUsage',
    assignee: 'marcos',
    creator: 'marcos',
    tags: ['recurso', 'encerrado'],
    metadata: { protocol_number: 'TRT24-DEMO-4567' },
  },
]

interface DemoHearingFixture {
  title: string
  description: string
  type: HearingType
  startsOffsetDays: number
  durationMinutes: number
  folder: LegalDemoFolderKey
  process: LegalDemoProcessKey
  creator: LegalDemoUserKey
  attendees: Array<{ user: LegalDemoUserKey; role: string; is_required: boolean }>
  location: string | null
  online_url: string | null
  judge: string | null
  notes: string
  metadata: Record<string, unknown>
}

export const legalDemoHearings: DemoHearingFixture[] = [
  {
    title: 'Audiência de instrução - ECT',
    description: 'Instrução e julgamento do cenário trabalhista.',
    type: 'instruction',
    startsOffsetDays: 3,
    durationMinutes: 120,
    folder: 'correiosLabor',
    process: 'correiosLabor',
    creator: 'marcos',
    attendees: [
      { user: 'patricia', role: 'Advogada responsável', is_required: true },
      { user: 'marcos', role: 'Revisor', is_required: false },
    ],
    location: 'TRT2 - Fórum Ruy Barbosa - Sala 405',
    online_url: null,
    judge: 'Dr. Fernando Costa',
    notes: 'Levar documentos e confirmar as três testemunhas.',
    metadata: { witnesses: 3 },
  },
  {
    title: 'Sessão de julgamento - Conflito de competência',
    description: 'Sessão da câmara cível para julgamento do conflito.',
    type: 'judgment',
    startsOffsetDays: 12,
    durationMinutes: 60,
    folder: 'zurichConflict',
    process: 'zurichConflict',
    creator: 'benicio',
    attendees: [
      { user: 'marcos', role: 'Advogado responsável', is_required: true },
      { user: 'benicio', role: 'Sócio revisor', is_required: false },
    ],
    location: null,
    online_url: 'https://meet.example.com/benicio-demo-julgamento',
    judge: 'Des. Luiz Umpierre de Mello Serra',
    notes: 'Preparar sustentação oral em vídeo.',
    metadata: { session_type: 'virtual' },
  },
  {
    title: 'Reunião sobre atos expropriatórios',
    description: 'Alinhamento prévio sobre o leilão do imóvel.',
    type: 'other',
    startsOffsetDays: 18,
    durationMinutes: 45,
    folder: 'caixaMortgage',
    process: 'caixaMortgage',
    creator: 'admin',
    attendees: [
      { user: 'patricia', role: 'Advogada responsável', is_required: true },
      { user: 'admin', role: 'Gestor', is_required: false },
    ],
    location: null,
    online_url: 'https://meet.example.com/benicio-demo-execucao',
    judge: null,
    notes: 'Revisar edital, avaliação e lance mínimo.',
    metadata: { minimum_value: 2650000 },
  },
  {
    title: 'Audiência de conciliação - Gallo Ferreira',
    description: 'Tentativa de composição no CEJUSC.',
    type: 'conciliation',
    startsOffsetDays: 25,
    durationMinutes: 90,
    folder: 'galloCollection',
    process: 'galloCollection',
    creator: 'andre',
    attendees: [{ user: 'andre', role: 'Advogado responsável', is_required: true }],
    location: 'TJSP - CEJUSC Central - Sala 12',
    online_url: null,
    judge: null,
    notes: 'Faixa de acordo definida no metadata do cenário.',
    metadata: { settlement_limit: 400000 },
  },
  {
    title: 'Reunião técnica - Ativos virtuais',
    description: 'Discussão técnica com a equipe de regulação.',
    type: 'other',
    startsOffsetDays: 7,
    durationMinutes: 90,
    folder: 'crypto',
    process: 'crypto',
    creator: 'benicio',
    attendees: [
      { user: 'andre', role: 'Advogado responsável', is_required: true },
      { user: 'benicio', role: 'Sócio revisor', is_required: false },
    ],
    location: 'Banco Central - Brasília',
    online_url: null,
    judge: null,
    notes: 'Reunião demonstrativa; nenhum compromisso real está representado.',
    metadata: { agenda: 'Esclarecimentos técnicos' },
  },
]

interface DemoDeadlineFixture {
  title: string
  description: string
  kind: DeadlineKind
  priority: DeadlinePriority
  is_fatal: boolean
  dueOffsetDays: number
  folder: LegalDemoFolderKey
  process: LegalDemoProcessKey
  assignee: LegalDemoUserKey
  creator: LegalDemoUserKey
  legal_basis: string | null
}

export const legalDemoDeadlines: DemoDeadlineFixture[] = [
  {
    title: 'Resposta à consulta regulatória',
    description: 'Prazo interno para consolidar a manifestação técnica.',
    kind: 'administrative',
    priority: 'urgent',
    is_fatal: true,
    dueOffsetDays: 2,
    folder: 'crypto',
    process: 'crypto',
    assignee: 'andre',
    creator: 'benicio',
    legal_basis: 'Cronograma regulatório demonstrativo',
  },
  {
    title: 'Envio do memorial',
    description: 'Enviar memorial antes da sessão de julgamento.',
    kind: 'judicial',
    priority: 'high',
    is_fatal: true,
    dueOffsetDays: 9,
    folder: 'zurichConflict',
    process: 'zurichConflict',
    assignee: 'marcos',
    creator: 'benicio',
    legal_basis: 'Regimento interno do tribunal',
  },
  {
    title: 'Confirmação das testemunhas',
    description: 'Confirmar comparecimento e documentos das testemunhas.',
    kind: 'internal',
    priority: 'high',
    is_fatal: false,
    dueOffsetDays: 1,
    folder: 'correiosLabor',
    process: 'correiosLabor',
    assignee: 'patricia',
    creator: 'marcos',
    legal_basis: null,
  },
  {
    title: 'Revisão do edital de leilão',
    description: 'Validar avaliação, publicação e condições do edital.',
    kind: 'judicial',
    priority: 'high',
    is_fatal: true,
    dueOffsetDays: 15,
    folder: 'caixaMortgage',
    process: 'caixaMortgage',
    assignee: 'patricia',
    creator: 'admin',
    legal_basis: 'Código de Processo Civil',
  },
  {
    title: 'Preparação da proposta de acordo',
    description: 'Definir cenários e limites para conciliação.',
    kind: 'extrajudicial',
    priority: 'medium',
    is_fatal: false,
    dueOffsetDays: 20,
    folder: 'galloCollection',
    process: 'galloCollection',
    assignee: 'andre',
    creator: 'andre',
    legal_basis: null,
  },
  {
    title: 'Atualização do plano de Open Finance',
    description: 'Consolidar pendências para retomada do projeto.',
    kind: 'internal',
    priority: 'medium',
    is_fatal: false,
    dueOffsetDays: 30,
    folder: 'openFinance',
    process: 'openFinance',
    assignee: 'julia',
    creator: 'andre',
    legal_basis: null,
  },
]

interface DemoMovementFixture {
  key: string
  process: LegalDemoProcessKey
  createdBy: LegalDemoUserKey
  occurred_at: string
  kind: string
  title: string
  description: string
  metadata: Record<string, unknown>
}

export const legalDemoMovements: DemoMovementFixture[] = [
  {
    key: 'crypto-opinion-filed',
    process: 'crypto',
    createdBy: 'andre',
    occurred_at: '2026-08-08T14:00:00-03:00',
    kind: 'protocolo',
    title: 'Parecer técnico protocolado',
    description: 'Manifestação sobre regulamentação de ativos virtuais apresentada.',
    metadata: { protocol_number: 'BCB-DEMO-789456' },
  },
  {
    key: 'zurich-concluded',
    process: 'zurichConflict',
    createdBy: 'marcos',
    occurred_at: '2026-08-10T16:30:00-03:00',
    kind: 'despacho',
    title: 'Autos conclusos ao relator',
    description: 'Processo encaminhado para análise do conflito de competência.',
    metadata: {},
  },
  {
    key: 'vehicle-judgment-published',
    process: 'vehicleUsage',
    createdBy: 'marcos',
    occurred_at: '2026-07-15T11:00:00-03:00',
    kind: 'publicação',
    title: 'Acórdão publicado',
    description: 'Publicação do julgamento no cenário trabalhista demonstrativo.',
    metadata: { edition: 'DEMO-2026-067' },
  },
  {
    key: 'mortgage-appraisal-filed',
    process: 'caixaMortgage',
    createdBy: 'patricia',
    occurred_at: '2026-08-11T10:15:00-03:00',
    kind: 'avaliação',
    title: 'Laudo de avaliação juntado',
    description: 'Avaliação do imóvel adicionada ao processo.',
    metadata: { appraised_value: 2650000 },
  },
  {
    key: 'gallo-injunction-granted',
    process: 'galloCollection',
    createdBy: 'andre',
    occurred_at: '2026-08-13T17:20:00-03:00',
    kind: 'decisão',
    title: 'Tutela cautelar deferida',
    description: 'Medida cautelar registrada no cenário de cobrança.',
    metadata: { amount: 487000 },
  },
]

interface DemoDocumentFixture {
  key: string
  folder: LegalDemoFolderKey
  process: LegalDemoProcessKey
  owner: LegalDemoUserKey
  file_name: string
  client_name: string
  title: string
  document_type: string
  description: string
  version: number
  is_signed: boolean
  metadata: Record<string, unknown>
}

export const legalDemoDocuments: DemoDocumentFixture[] = [
  {
    key: 'crypto-legal-opinion',
    folder: 'crypto',
    process: 'crypto',
    owner: 'andre',
    file_name: 'parecer-regulamentacao-criptoativos.md',
    client_name: 'Parecer - Regulamentação de criptoativos',
    title: 'Parecer técnico - Regulamentação de criptoativos',
    document_type: 'legal_opinion',
    description: 'Placeholder navegável do parecer técnico demonstrativo.',
    version: 3,
    is_signed: true,
    metadata: { confidential: true, pages: 127 },
  },
  {
    key: 'zurich-policy',
    folder: 'zurichConflict',
    process: 'zurichConflict',
    owner: 'marcos',
    file_name: 'apolice-seguro-demonstrativa.md',
    client_name: 'Apólice de seguro demonstrativa',
    title: 'Apólice de seguro',
    document_type: 'contract',
    description: 'Placeholder navegável da apólice usada no cenário.',
    version: 1,
    is_signed: true,
    metadata: { policy_number: 'ZUR-DEMO-98765' },
  },
  {
    key: 'zurich-expert-report',
    folder: 'zurichConflict',
    process: 'zurichConflict',
    owner: 'marcos',
    file_name: 'laudo-pericial-demonstrativo.md',
    client_name: 'Laudo pericial demonstrativo',
    title: 'Laudo pericial',
    document_type: 'expert_report',
    description: 'Placeholder navegável do laudo técnico demonstrativo.',
    version: 1,
    is_signed: true,
    metadata: { conclusion: 'Cenário de perda total' },
  },
  {
    key: 'vehicle-judgment',
    folder: 'vehicleUsage',
    process: 'vehicleUsage',
    owner: 'marcos',
    file_name: 'acordao-trabalhista-demonstrativo.md',
    client_name: 'Acórdão trabalhista demonstrativo',
    title: 'Acórdão trabalhista',
    document_type: 'decision',
    description: 'Placeholder navegável do acórdão demonstrativo.',
    version: 1,
    is_signed: true,
    metadata: { votes: '8-0', synthetic: true },
  },
  {
    key: 'carf-defense',
    folder: 'carf',
    process: 'carf',
    owner: 'benicio',
    file_name: 'defesa-administrativa-demonstrativa.md',
    client_name: 'Defesa administrativa demonstrativa',
    title: 'Defesa administrativa',
    document_type: 'petition',
    description: 'Placeholder navegável da defesa administrativa anonimizada.',
    version: 1,
    is_signed: true,
    metadata: { confidential: true, synthetic: true },
  },
  {
    key: 'mortgage-contract',
    folder: 'caixaMortgage',
    process: 'caixaMortgage',
    owner: 'patricia',
    file_name: 'cedula-credito-imobiliario-demo.md',
    client_name: 'Cédula de crédito imobiliário demonstrativa',
    title: 'Cédula de crédito imobiliário',
    document_type: 'contract',
    description: 'Placeholder navegável do contrato do cenário de execução.',
    version: 1,
    is_signed: true,
    metadata: { contract_value: 2500000, units: 50 },
  },
]

interface DemoMessageFixture {
  recipient: LegalDemoUserKey
  sender: LegalDemoUserKey | null
  subject: string
  body: string
  priority: 'low' | 'normal' | 'high'
  read: boolean
  folder: LegalDemoFolderKey
}

export const legalDemoMessages: DemoMessageFixture[] = [
  {
    recipient: 'andre',
    sender: 'benicio',
    subject: 'Prazo da consulta regulatória',
    body: 'André, precisamos fechar a revisão do parecer antes do prazo interno.',
    priority: 'high',
    read: false,
    folder: 'crypto',
  },
  {
    recipient: 'marcos',
    sender: 'patricia',
    subject: 'Documentos para audiência trabalhista',
    body: 'Os documentos foram revisados e as testemunhas estão confirmadas.',
    priority: 'normal',
    read: true,
    folder: 'correiosLabor',
  },
  {
    recipient: 'patricia',
    sender: 'admin',
    subject: 'Avaliação do imóvel',
    body: 'O laudo foi recebido. Atualize a estratégia para os atos expropriatórios.',
    priority: 'normal',
    read: false,
    folder: 'caixaMortgage',
  },
  {
    recipient: 'benicio',
    sender: null,
    subject: 'Publicação do acórdão trabalhista',
    body: 'O acórdão demonstrativo foi publicado e a pasta pode ser encerrada.',
    priority: 'high',
    read: true,
    folder: 'vehicleUsage',
  },
  {
    recipient: 'andre',
    sender: 'julia',
    subject: 'Pesquisa sobre Open Finance',
    body: 'A pesquisa de precedentes e normativos foi concluída e anexada à pasta.',
    priority: 'normal',
    read: true,
    folder: 'openFinance',
  },
]

interface DemoNotificationFixture {
  recipient: LegalDemoUserKey
  actor: LegalDemoUserKey | null
  type: 'info' | 'success' | 'warning' | 'error' | 'task' | 'hearing' | 'deadline'
  title: string
  message: string
  read: boolean
  folder: LegalDemoFolderKey | null
  action_text: string
}

export const legalDemoNotifications: DemoNotificationFixture[] = [
  {
    recipient: 'andre',
    actor: 'benicio',
    type: 'deadline',
    title: 'Prazo regulatório se aproximando',
    message: 'A resposta à consulta regulatória vence em dois dias.',
    read: false,
    folder: 'crypto',
    action_text: 'Ver pasta',
  },
  {
    recipient: 'patricia',
    actor: 'marcos',
    type: 'hearing',
    title: 'Audiência de instrução próxima',
    message: 'Confirme documentos e testemunhas para a audiência trabalhista.',
    read: false,
    folder: 'correiosLabor',
    action_text: 'Ver pasta',
  },
  {
    recipient: 'marcos',
    actor: 'benicio',
    type: 'task',
    title: 'Novo memorial atribuído',
    message: 'Prepare o memorial do conflito de competência.',
    read: true,
    folder: 'zurichConflict',
    action_text: 'Ver pasta',
  },
  {
    recipient: 'benicio',
    actor: 'andre',
    type: 'success',
    title: 'Tutela cautelar registrada',
    message: 'A decisão foi adicionada ao cenário de cobrança.',
    read: true,
    folder: 'galloCollection',
    action_text: 'Ver pasta',
  },
  {
    recipient: 'andre',
    actor: null,
    type: 'info',
    title: 'Atualização regulatória disponível',
    message: 'Uma atualização demonstrativa foi associada ao caso de ativos virtuais.',
    read: false,
    folder: 'crypto',
    action_text: 'Consultar',
  },
  {
    recipient: 'patricia',
    actor: 'admin',
    type: 'warning',
    title: 'Documento pendente',
    message: 'Revise a procuração antes dos próximos atos da execução.',
    read: false,
    folder: 'caixaMortgage',
    action_text: 'Resolver',
  },
  {
    recipient: 'admin',
    actor: null,
    type: 'error',
    title: 'Integração judicial indisponível',
    message: 'Falha demonstrativa ao consultar o sistema externo.',
    read: false,
    folder: null,
    action_text: 'Ver detalhes',
  },
]

export const legalDemoFavorites: Array<{
  user: LegalDemoUserKey
  folder: LegalDemoFolderKey
}> = [
  { user: 'admin', folder: 'crypto' },
  { user: 'admin', folder: 'zurichConflict' },
  { user: 'admin', folder: 'caixaMortgage' },
  { user: 'andre', folder: 'crypto' },
  { user: 'andre', folder: 'openFinance' },
  { user: 'marcos', folder: 'zurichConflict' },
  { user: 'marcos', folder: 'vehicleUsage' },
  { user: 'patricia', folder: 'correiosLabor' },
  { user: 'patricia', folder: 'caixaMortgage' },
  { user: 'benicio', folder: 'carf' },
]
