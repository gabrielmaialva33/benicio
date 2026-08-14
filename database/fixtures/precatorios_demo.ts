import { cnpjFrom, cpfFrom } from '#database/factories/support/legal_identifiers'
import type { DemoUserFixture } from '#database/fixtures/legal_demo'
import type { ClientAddress } from '#modules/clients/interfaces/client_interface'
import type { FolderStatus } from '#modules/folders/interfaces/folder_interface'

export const PRECATORIOS_DEMO_SEED_KEY = 'benicio-precatorios-demo-v2'

export const precatoriosDemoUsers = {
  manager: {
    full_name: 'Dr. Roberto - Gestão de Precatórios',
    email: 'gestor.precatorios@benicio.com.br',
    username: 'gestor.precatorios',
    tenantRole: 'admin',
    systemRoles: ['admin', 'editor', 'user'],
  },
  lawyer: {
    full_name: 'Dr. Carlos - Especialista em Precatórios',
    email: 'carlos.precatorios@benicio.com.br',
    username: 'carlos.precatorios',
    tenantRole: 'member',
    systemRoles: ['editor', 'user'],
  },
  assistant: {
    full_name: 'Ana Paula - Auxiliar de Precatórios',
    email: 'ana.auxiliar@benicio.com.br',
    username: 'ana.auxiliar',
    tenantRole: 'member',
    systemRoles: ['user'],
  },
} as const satisfies Record<string, DemoUserFixture>

export type PrecatoriosDemoUserKey = keyof typeof precatoriosDemoUsers

interface PublicEntityFixture {
  name: string
  document: string
  email: string
  phone: string
  address: ClientAddress
  notes: string
  metadata: Record<string, unknown>
}

export const precatoriosPublicEntities = {
  saoPauloState: {
    name: 'Estado de São Paulo',
    document: '46377222000129',
    email: 'procuradoria@sp.gov.example',
    phone: '(11) 3291-7100',
    address: {
      street: 'Av. Rangel Pestana',
      number: '300',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      postal_code: '01017911',
      country: 'BR',
    },
    notes: 'Ente público usado em cenário sintético de precatórios.',
    metadata: { entity_type: 'state', payment_regime: 'special', rpv_limit: 11733.9 },
  },
  saoPauloCity: {
    name: 'Município de São Paulo',
    document: '46395000000139',
    email: 'pgm@prefeitura.sp.gov.example',
    phone: '(11) 3397-2000',
    address: {
      street: 'Viaduto do Chá',
      number: '15',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      postal_code: '01002900',
      country: 'BR',
    },
    notes: 'Ente público usado em cenário sintético de precatórios.',
    metadata: { entity_type: 'city', payment_regime: 'special', rpv_limit: 6622 },
  },
  minasGeraisState: {
    name: 'Estado de Minas Gerais',
    document: '18715615000160',
    email: 'age@mg.gov.example',
    phone: '(31) 3915-0300',
    address: {
      street: 'Av. Afonso Pena',
      number: '4000',
      neighborhood: 'Cruzeiro',
      city: 'Belo Horizonte',
      state: 'MG',
      postal_code: '30130009',
      country: 'BR',
    },
    notes: 'Ente público usado em cenário sintético de precatórios.',
    metadata: { entity_type: 'state', payment_regime: 'general', rpv_limit: 19200 },
  },
  rioDeJaneiroState: {
    name: 'Estado do Rio de Janeiro',
    document: '42498600000171',
    email: 'pge@rj.gov.example',
    phone: '(21) 2332-6300',
    address: {
      street: 'Rua do Carmo',
      number: '27',
      neighborhood: 'Centro',
      city: 'Rio de Janeiro',
      state: 'RJ',
      postal_code: '20011020',
      country: 'BR',
    },
    notes: 'Ente público usado em cenário sintético de precatórios.',
    metadata: { entity_type: 'state', payment_regime: 'special', rpv_limit: 18571 },
  },
  inss: {
    name: 'Instituto Nacional do Seguro Social - INSS',
    document: '29979036000140',
    email: 'presidencia@inss.gov.example',
    phone: '(61) 3313-4000',
    address: {
      street: 'SAUS Quadra 2 Bloco O',
      number: 'Ed. FNDE',
      neighborhood: 'Asa Sul',
      city: 'Brasília',
      state: 'DF',
      postal_code: '70070946',
      country: 'BR',
    },
    notes: 'Autarquia usada em cenário sintético de precatórios previdenciários.',
    metadata: { entity_type: 'federal_agency', payment_regime: 'general', rpv_limit: 73369 },
  },
  beloHorizonteCity: {
    name: 'Município de Belo Horizonte',
    document: '18715383000140',
    email: 'pgm@pbh.gov.example',
    phone: '(31) 3277-4602',
    address: {
      street: 'Av. Afonso Pena',
      number: '1212',
      neighborhood: 'Centro',
      city: 'Belo Horizonte',
      state: 'MG',
      postal_code: '30130003',
      country: 'BR',
    },
    notes: 'Ente público usado em cenário sintético de precatórios.',
    metadata: { entity_type: 'city', payment_regime: 'general', rpv_limit: 9600 },
  },
} as const satisfies Record<string, PublicEntityFixture>

export type PrecatoriosPublicEntityKey = keyof typeof precatoriosPublicEntities

export interface PrecatorioMovementFixture {
  occurred_at: string
  title: string
}

export interface PrecatorioFixture {
  code: string
  legacy_number: string
  tribunal: string
  judicial_body: string
  district: string
  nature: string
  beneficiary: string
  beneficiary_document: string
  beneficiary_person_type: 'individual' | 'company'
  entity: PrecatoriosPublicEntityKey
  principal_value: string
  updated_value: string
  request_date: string
  update_date: string
  chronological_order: number
  budget_year: number
  source_status: string
  folder_status: FolderStatus
  priority: boolean
  beneficiary_age: number | null
  serious_illness: boolean
  responsible: PrecatoriosDemoUserKey
  movements: [PrecatorioMovementFixture, PrecatorioMovementFixture]
}

export const precatoriosDemoCases: PrecatorioFixture[] = [
  {
    code: 'PREC-2024-00001',
    legacy_number: '0001234-56.2020.8.26.0053',
    tribunal: 'TJSP',
    judicial_body: 'DEPRE - Diretoria de Execuções de Precatórios',
    district: 'São Paulo',
    nature: 'Alimentar',
    beneficiary: 'João Silva Santos',
    beneficiary_document: cpfFrom('123456789'),
    beneficiary_person_type: 'individual',
    entity: 'saoPauloState',
    principal_value: '125000.00',
    updated_value: '145000.00',
    request_date: '2020-03-15',
    update_date: '2024-01-10',
    chronological_order: 1,
    budget_year: 2025,
    source_status: 'Aguardando pagamento',
    folder_status: 'pending',
    priority: true,
    beneficiary_age: 72,
    serious_illness: false,
    responsible: 'manager',
    movements: [
      { occurred_at: '2020-04-10T10:00:00-03:00', title: 'Precatório autuado no Tribunal' },
      { occurred_at: '2024-01-10T14:00:00-03:00', title: 'Valores atualizados' },
    ],
  },
  {
    code: 'PREC-2024-00002',
    legacy_number: '0005678-90.2019.8.26.0100',
    tribunal: 'TJSP',
    judicial_body: 'DEPRE - Diretoria de Execuções de Precatórios',
    district: 'São Paulo',
    nature: 'Comum',
    beneficiary: 'Construtora ABC Ltda.',
    beneficiary_document: cnpjFrom('123456780001'),
    beneficiary_person_type: 'company',
    entity: 'saoPauloState',
    principal_value: '2500000.00',
    updated_value: '2850000.00',
    request_date: '2019-06-20',
    update_date: '2024-01-15',
    chronological_order: 45,
    budget_year: 2025,
    source_status: 'Em análise',
    folder_status: 'active',
    priority: false,
    beneficiary_age: null,
    serious_illness: false,
    responsible: 'lawyer',
    movements: [
      { occurred_at: '2019-07-15T10:00:00-03:00', title: 'Documentação complementar solicitada' },
      { occurred_at: '2024-01-15T14:00:00-03:00', title: 'Análise pela procuradoria registrada' },
    ],
  },
  {
    code: 'PREC-2024-00003',
    legacy_number: '0009876-54.2021.8.13.0024',
    tribunal: 'TJMG',
    judicial_body: 'Assessoria de Precatórios',
    district: 'Belo Horizonte',
    nature: 'Alimentar',
    beneficiary: 'Maria Aparecida Oliveira',
    beneficiary_document: cpfFrom('987654321'),
    beneficiary_person_type: 'individual',
    entity: 'minasGeraisState',
    principal_value: '85000.00',
    updated_value: '92000.00',
    request_date: '2021-08-10',
    update_date: '2024-02-01',
    chronological_order: 12,
    budget_year: 2024,
    source_status: 'Pago parcialmente',
    folder_status: 'active',
    priority: true,
    beneficiary_age: null,
    serious_illness: true,
    responsible: 'manager',
    movements: [
      { occurred_at: '2023-12-15T10:00:00-03:00', title: 'Primeiro pagamento parcial realizado' },
      { occurred_at: '2024-02-01T14:00:00-03:00', title: 'Saldo atualizado para pagamento' },
    ],
  },
  {
    code: 'PREC-2024-00004',
    legacy_number: '0003456-78.2018.8.19.0001',
    tribunal: 'TJRJ',
    judicial_body: 'Departamento de Precatórios Judiciais',
    district: 'Rio de Janeiro',
    nature: 'Alimentar',
    beneficiary: 'José Carlos Pereira',
    beneficiary_document: cpfFrom('456789123'),
    beneficiary_person_type: 'individual',
    entity: 'rioDeJaneiroState',
    principal_value: '320000.00',
    updated_value: '380000.00',
    request_date: '2018-11-25',
    update_date: '2024-01-20',
    chronological_order: 8,
    budget_year: 2024,
    source_status: 'Aguardando pagamento',
    folder_status: 'pending',
    priority: true,
    beneficiary_age: 68,
    serious_illness: false,
    responsible: 'lawyer',
    movements: [
      { occurred_at: '2019-01-10T10:00:00-03:00', title: 'Inclusão na ordem cronológica' },
      { occurred_at: '2024-01-20T14:00:00-03:00', title: 'Atualização monetária realizada' },
    ],
  },
  {
    code: 'PREC-2024-00005',
    legacy_number: '0007890-12.2020.8.26.0032',
    tribunal: 'TJSP',
    judicial_body: 'DEPRE - Diretoria de Execuções de Precatórios',
    district: 'São Paulo',
    nature: 'Comum',
    beneficiary: 'Hospital São Lucas S.A.',
    beneficiary_document: cnpjFrom('987654320001'),
    beneficiary_person_type: 'company',
    entity: 'saoPauloState',
    principal_value: '4500000.00',
    updated_value: '4950000.00',
    request_date: '2020-09-30',
    update_date: '2024-02-05',
    chronological_order: 120,
    budget_year: 2026,
    source_status: 'Aguardando dotação orçamentária',
    folder_status: 'pending',
    priority: false,
    beneficiary_age: null,
    serious_illness: false,
    responsible: 'manager',
    movements: [
      { occurred_at: '2021-01-15T10:00:00-03:00', title: 'Inscrição para pagamento' },
      { occurred_at: '2024-02-05T14:00:00-03:00', title: 'Aguardando previsão orçamentária' },
    ],
  },
  {
    code: 'PREC-2024-00006',
    legacy_number: '0002468-13.2022.5.02.0001',
    tribunal: 'TRT2',
    judicial_body: 'Juízo Auxiliar em Execução',
    district: 'São Paulo',
    nature: 'Alimentar Trabalhista',
    beneficiary: 'Ana Paula Mendes',
    beneficiary_document: cpfFrom('789123456'),
    beneficiary_person_type: 'individual',
    entity: 'saoPauloCity',
    principal_value: '68000.00',
    updated_value: '72000.00',
    request_date: '2022-05-10',
    update_date: '2024-01-25',
    chronological_order: 3,
    budget_year: 2024,
    source_status: 'Em processamento',
    folder_status: 'active',
    priority: false,
    beneficiary_age: null,
    serious_illness: false,
    responsible: 'lawyer',
    movements: [
      { occurred_at: '2023-08-20T10:00:00-03:00', title: 'Documentação complementar apresentada' },
      { occurred_at: '2024-01-25T14:00:00-03:00', title: 'Processamento para pagamento iniciado' },
    ],
  },
]

export const precatoriosDocumentTemplates = [
  {
    key: 'requisition',
    file_name: 'oficio-requisitorio-demonstrativo.md',
    title: 'Ofício requisitório de precatório',
    document_type: 'requisition_letter',
    description: 'Ofício requisitório sintético expedido pelo juízo da execução.',
    version: 1,
    is_signed: true,
  },
  {
    key: 'finality-certificate',
    file_name: 'certidao-transito-julgado-demonstrativa.md',
    title: 'Certidão de trânsito em julgado',
    document_type: 'certificate',
    description: 'Certidão sintética de trânsito em julgado.',
    version: 1,
    is_signed: true,
  },
  {
    key: 'calculation',
    file_name: 'memoria-calculo-demonstrativa.md',
    title: 'Memória de cálculo atualizada',
    document_type: 'calculation',
    description: 'Memória sintética de atualização monetária e juros.',
    version: 2,
    is_signed: false,
  },
] as const
