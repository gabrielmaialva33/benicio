/*
|--------------------------------------------------------------------------
| Domain labels
|--------------------------------------------------------------------------
|
| Every enum the API returns, translated once. Before this file the same
| dictionaries were re-declared inside `folder_detail_content`,
| `process_formatters`, `dashboard_content` and the notifications page, which
| is how "Ativa" and "Ativas" ended up describing the same status.
|
| Add a status here, never inline in a component.
|
*/

import type { ClientPersonType } from '~/types/client'
import type { FolderStatus } from '~/types/folder'
import type {
  ProcessDistributionType,
  ProcessInstance,
  ProcessPartySide,
  ProcessPhase,
  ProcessStatus,
} from '~/types/process'

// ── Processes ──

export const PROCESS_STATUS_LABELS: Record<ProcessStatus, string> = {
  active: 'Ativo',
  suspended: 'Suspenso',
  archived: 'Arquivado',
  closed: 'Encerrado',
}

export const PROCESS_INSTANCE_LABELS: Record<ProcessInstance, string> = {
  first: '1ª instância',
  second: '2ª instância',
  superior: 'Tribunal superior',
}

export const PROCESS_PHASE_LABELS: Record<ProcessPhase, string> = {
  knowledge: 'Conhecimento',
  execution: 'Execução',
  appeal: 'Recurso',
  sentence_compliance: 'Cumprimento de sentença',
}

export const PROCESS_DISTRIBUTION_LABELS: Record<ProcessDistributionType, string> = {
  lottery: 'Sorteio',
  dependency: 'Dependência',
  prevention: 'Prevenção',
}

export const PROCESS_PARTY_SIDE_LABELS: Record<ProcessPartySide, string> = {
  active: 'Polo ativo',
  passive: 'Polo passivo',
  third: 'Terceiro',
  other: 'Outro',
}

// ── Folders ──

export const FOLDER_STATUS_LABELS: Record<FolderStatus, string> = {
  active: 'Ativa',
  completed: 'Concluída',
  pending: 'Pendente',
  cancelled: 'Cancelada',
  archived: 'Arquivada',
}

// ── Clients ──

export const CLIENT_PERSON_TYPE_LABELS: Record<ClientPersonType, string> = {
  individual: 'Pessoa física',
  company: 'Pessoa jurídica',
}

// ── Tasks, deadlines and hearings ──

export const TASK_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
}

export const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
}

export const DEADLINE_KIND_LABELS: Record<string, string> = {
  judicial: 'Judicial',
  administrative: 'Administrativo',
  internal: 'Interno',
}

// ── Notifications ──

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  info: 'Informação',
  success: 'Sucesso',
  warning: 'Atenção',
  error: 'Erro',
  task: 'Tarefa',
  hearing: 'Audiência',
  deadline: 'Prazo',
  message: 'Mensagem',
  system: 'Sistema',
}

/**
 * The dashboard aggregates folders, processes and tasks in the same chart, so
 * its legend needs the plural, collection-wide reading of a status rather than
 * the singular one a detail page uses.
 */
export const AGGREGATE_STATUS_LABELS: Record<string, string> = {
  active: 'Ativas',
  completed: 'Concluídas',
  pending: 'Pendentes',
  cancelled: 'Canceladas',
  archived: 'Arquivadas',
  in_progress: 'Em andamento',
}

/** Falls back to the raw key so an unmapped status is visible, not blank. */
export function labelOf(dictionary: Record<string, string>, key: string | null | undefined) {
  if (!key) return '—'
  return dictionary[key] ?? key
}
