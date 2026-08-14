/**
 * Single source of truth for how a permission action is coloured.
 *
 * The roles and permissions screens both list `resource.action` pairs, and each
 * had grown its own palette — roles painted every action the same violet while
 * permissions coloured a handful and left the rest grey. Reading the two pages
 * side by side, the same capability changed meaning.
 *
 * Actions are grouped by what they let someone *do*, not by name, so a reader
 * can tell a destructive grant from a read-only one at a glance.
 */
export type PermissionBadgeVariant = 'success' | 'info' | 'warning' | 'destructive' | 'secondary'

const READ_ONLY_ACTIONS = new Set(['read', 'list', 'view', 'export'])
const CREATE_ACTIONS = new Set(['create', 'import'])
const DESTRUCTIVE_ACTIONS = new Set(['delete', 'revoke', 'cancel'])

/**
 * The set of actions is open-ended: the enum in the backend covers the CRUD
 * core, but permission sync also registers domain verbs (`sign`, `reschedule`,
 * `status_change`, …). Anything that survives the checks below changes state,
 * which is why mutation is the fallback rather than a neutral grey.
 */
export function actionBadgeVariant(action: string): PermissionBadgeVariant {
  const normalized = action.toLowerCase()

  if (READ_ONLY_ACTIONS.has(normalized)) return 'info'
  if (CREATE_ACTIONS.has(normalized)) return 'success'
  if (DESTRUCTIVE_ACTIONS.has(normalized)) return 'destructive'

  return 'warning'
}
