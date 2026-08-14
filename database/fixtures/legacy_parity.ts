/**
 * Executable parity baseline extracted from the legacy factories and seeders.
 * New seeds may exceed these numbers, but a regression test must reject less.
 */
export const LEGACY_FACTORY_PARITY = {
  exportedFactories: 7,
  legacyStates: 18,
} as const

export const LEGACY_REALISTIC_PARITY = {
  users: 9,
  clients: 8,
  folders: 8,
  processes: 3,
  documents: 6,
  movements: 4,
  tasks: 6,
  hearings: 5,
  messages: 5,
  notifications: 7,
  favorites: 8,
  authTokens: 16,
  files: 15,
  specialPermissions: 21,
  userPermissions: 6,
  rateLimits: 15,
  auditLogs: 154,
} as const

export const LEGACY_PRECATORIOS_PARITY = {
  users: 3,
  publicEntityClients: 6,
  folders: 6,
  processes: 6,
  documents: 18,
  movements: 12,
  tasks: 9,
  hearings: 3,
} as const
