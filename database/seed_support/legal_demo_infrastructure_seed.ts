import { createHash } from 'node:crypto'
import { stat } from 'node:fs/promises'

import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'

import {
  LEGAL_DEMO_REFERENCE_DATE,
  LEGAL_DEMO_SEED_KEY,
  legalDemoClients,
  type LegalDemoClientKey,
  type LegalDemoFolderKey,
  type LegalDemoUserKey,
} from '#database/fixtures/legal_demo'
import {
  legalDemoDirectPermissions,
  legalDemoRateLimits,
  legalDemoRolePermissionNames,
  legalDemoSpecialPermissions,
  legalDemoStandaloneFiles,
  legalDemoTokenUsers,
} from '#database/fixtures/legal_demo_infrastructure'
import type { LegalDemoAccessContext } from '#database/seed_support/demo_access'
import AuditLog from '#modules/audits/models/audit_log'
import File from '#modules/files/models/file'
import Permission from '#modules/permissions/models/permission'
import Role from '#modules/roles/models/role'

const DEMO_FILE_URL = '/yol/demo-documents/arquivo-geral-demonstrativo.md'

export interface LegalDemoInfrastructureSummary {
  specialPermissions: number
  userPermissions: number
  authTokens: number
  sessionRefreshTokens: number
  standaloneFiles: number
  rateLimits: number
  auditLogs: number
}

function seededMetadata(metadata: Record<string, unknown> = {}) {
  return { ...metadata, seed_key: LEGAL_DEMO_SEED_KEY }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function uuidFrom(value: string): string {
  const hex = sha256(value).slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`
}

async function seedSpecialPermissions(client: QueryClientContract): Promise<Map<string, number>> {
  for (const [name, resource, action, description] of legalDemoSpecialPermissions) {
    await Permission.updateOrCreate(
      { resource, action, context: 'any' },
      { name, resource, action, context: 'any', description },
      { client }
    )
  }

  const permissionNames = new Set([
    ...legalDemoSpecialPermissions.map(([name]) => name),
    ...Object.values(legalDemoDirectPermissions).flat(),
  ])
  const permissions = await Permission.query({ client }).whereIn('name', [...permissionNames])
  return new Map(permissions.map((permission) => [permission.name, permission.id]))
}

async function seedRolePermissions(
  client: QueryClientContract,
  permissionIds: Map<string, number>
): Promise<void> {
  for (const [slug, names] of Object.entries(legalDemoRolePermissionNames)) {
    const role = await Role.findByOrFail('slug', slug, { client })
    const rows = names.map((name) => ({
      role_id: role.id,
      permission_id: permissionIds.get(name)!,
    }))
    if (rows.length > 0) {
      await client
        .table('role_permissions')
        .insert(rows)
        .onConflict(['role_id', 'permission_id'])
        .ignore()
    }
  }
}

async function seedDirectPermissions(
  client: QueryClientContract,
  access: LegalDemoAccessContext,
  permissionIds: Map<string, number>
): Promise<number> {
  let count = 0

  for (const [userKey, names] of Object.entries(legalDemoDirectPermissions) as Array<
    [LegalDemoUserKey, readonly string[]]
  >) {
    const rows = names.map((name) => ({
      user_id: access.userIds[userKey],
      permission_id: permissionIds.get(name)!,
      granted: true,
      expires_at: null,
    }))
    if (rows.length > 0) {
      await client
        .table('user_permissions')
        .insert(rows)
        .onConflict(['user_id', 'permission_id'])
        .merge({
          granted: true,
          expires_at: null,
        })
      count += rows.length
    }
  }

  return count
}

async function seedAuthTokens(
  client: QueryClientContract,
  access: LegalDemoAccessContext
): Promise<{ authTokens: number; sessionRefreshTokens: number }> {
  const now = DateTime.now()
  let authTokens = 0
  let sessionRefreshTokens = 0

  for (const [index, userKey] of legalDemoTokenUsers.entries()) {
    const userId = access.userIds[userKey]

    for (const type of ['auth_token', 'refresh_token'] as const) {
      const name = `${LEGAL_DEMO_SEED_KEY}:${userKey}:${type}`
      const payload = {
        tokenable_id: userId,
        type,
        name,
        hash: sha256(`${name}:secret`),
        abilities: JSON.stringify(['*']),
        created_at: now.toJSDate(),
        updated_at: now.toJSDate(),
        last_used_at: now.minus({ hours: index + 1 }).toJSDate(),
        expires_at: now.plus({ days: 30 }).toJSDate(),
      }
      const existing = await client
        .from('auth_access_tokens')
        .where({ tokenable_id: userId, type, name })
        .select('id')
        .first()

      if (existing) {
        await client.from('auth_access_tokens').where('id', existing.id).update(payload)
      } else {
        await client.table('auth_access_tokens').insert(payload)
      }
      authTokens++
    }

    const id = uuidFrom(`${LEGAL_DEMO_SEED_KEY}:session:${userKey}`)
    await client
      .table('refresh_tokens')
      .insert({
        id,
        family_id: uuidFrom(`${LEGAL_DEMO_SEED_KEY}:family:${userKey}`),
        user_id: userId,
        tenant_id: access.tenantId,
        token_hash: sha256(`${LEGAL_DEMO_SEED_KEY}:jwt-refresh:${userKey}`),
        replaced_by_id: null,
        expires_at: now.plus({ days: 3 }).toJSDate(),
        used_at: null,
        revoked_at: null,
        revoked_reason: null,
        created_ip: '127.0.0.1',
        user_agent: 'Benicio legal demo seeder',
        created_at: now.toJSDate(),
      })
      .onConflict('id')
      .merge({
        user_id: userId,
        tenant_id: access.tenantId,
        token_hash: sha256(`${LEGAL_DEMO_SEED_KEY}:jwt-refresh:${userKey}`),
        expires_at: now.plus({ days: 3 }).toJSDate(),
      })
    sessionRefreshTokens++
  }

  return { authTokens, sessionRefreshTokens }
}

async function seedStandaloneFiles(
  client: QueryClientContract,
  access: LegalDemoAccessContext,
  clientIds: Record<LegalDemoClientKey, number>
): Promise<number> {
  const asset = await stat(app.publicPath('yol/demo-documents/arquivo-geral-demonstrativo.md'))

  for (const fixture of legalDemoStandaloneFiles) {
    const storedName = `demo/files/${fixture.file_name}`
    await File.updateOrCreate(
      { tenant_id: access.tenantId, file_name: storedName },
      {
        tenant_id: access.tenantId,
        owner_id: access.userIds[fixture.owner],
        client_name: legalDemoClients[fixture.client].name,
        file_name: storedName,
        file_size: asset.size,
        file_type: 'text/markdown',
        file_category: fixture.category,
        url: DEMO_FILE_URL,
      },
      { client }
    )
  }

  // Accessing the map here makes the tenant-safe client binding part of the contract.
  for (const fixture of legalDemoStandaloneFiles) {
    if (!clientIds[fixture.client]) throw new Error(`Missing demo client for ${fixture.file_name}`)
  }
  return legalDemoStandaloneFiles.length
}

function resolveRateLimitKey(key: string, access: LegalDemoAccessContext): string {
  return key
    .replace(':user:1', `:user:${access.userIds.admin}`)
    .replace(':user:2', `:user:${access.userIds.andre}`)
    .replace(':user:3', `:user:${access.userIds.marcos}`)
}

async function seedRateLimits(
  client: QueryClientContract,
  access: LegalDemoAccessContext
): Promise<number> {
  const now = DateTime.now().toUnixInteger()
  for (const [key, points, ttl] of legalDemoRateLimits) {
    await client
      .table('rate_limits')
      .insert({ key: resolveRateLimitKey(key, access), points, expire: now + ttl })
      .onConflict('key')
      .merge({ points, expire: now + ttl })
  }
  return legalDemoRateLimits.length
}

async function seedAuditLogs(
  client: QueryClientContract,
  access: LegalDemoAccessContext,
  folderIds: Record<LegalDemoFolderKey, number>
): Promise<number> {
  const reference = DateTime.fromISO(LEGAL_DEMO_REFERENCE_DATE, { setZone: true })
  const users: LegalDemoUserKey[] = [
    'admin',
    'benicio',
    'andre',
    'marcos',
    'patricia',
    'mariana',
    'fernanda',
    'pedro',
    'julia',
  ]
  const folderKeys = Object.keys(folderIds) as LegalDemoFolderKey[]
  const actions = ['create', 'read', 'update', 'delete', 'list'] as const
  const resources = ['folders', 'documents', 'users', 'clients', 'tasks', 'hearings'] as const
  const methods = ['POST', 'GET', 'PUT', 'DELETE'] as const
  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Mozilla/5.0 (X11; Linux x86_64)',
  ] as const
  const ipAddresses = ['192.0.2.10', '192.0.2.11', '198.51.100.20', '203.0.113.30'] as const

  for (let index = 0; index < 150; index++) {
    const action = actions[index % actions.length]
    const resource = resources[(index * 7) % resources.length]
    const userKey = users[(index * 5) % users.length]
    const granted = index % 10 !== 9
    const occurredAt = reference.minus({
      days: index % 30,
      hours: (index * 7) % 24,
      minutes: (index * 13) % 60,
    })
    const folderId =
      resource === 'folders' ? folderIds[folderKeys[index % folderKeys.length]] : null

    await AuditLog.updateOrCreate(
      { session_id: `${LEGAL_DEMO_SEED_KEY}:audit:${String(index + 1).padStart(3, '0')}` },
      {
        user_id: access.userIds[userKey],
        session_id: `${LEGAL_DEMO_SEED_KEY}:audit:${String(index + 1).padStart(3, '0')}`,
        ip_address: ipAddresses[index % ipAddresses.length],
        user_agent: userAgents[index % userAgents.length],
        resource,
        action,
        context: 'tenant',
        resource_id: folderId,
        method: methods[index % methods.length],
        url: `/api/v1/${resource}`,
        request_data: action === 'create' ? { fixture: true } : null,
        result: granted ? 'granted' : 'denied',
        reason: granted ? null : 'Permissão insuficiente no cenário demonstrativo',
        response_code: granted ? 200 : 403,
        metadata: seededMetadata({ duration_ms: 50 + ((index * 37) % 950), source: 'web_app' }),
        created_at: occurredAt,
        updated_at: occurredAt,
      },
      { client }
    )
  }

  const importantEvents = [
    ['important-folder', 'benicio', 'folders', 'create', 'crypto'],
    ['important-document', 'andre', 'documents', 'sign', 'crypto'],
    ['important-hearing', 'patricia', 'hearings', 'schedule', 'correiosLabor'],
    ['important-system', null, 'system', 'backup', null],
  ] as const

  for (const [key, userKey, resource, action, folderKey] of importantEvents) {
    await AuditLog.updateOrCreate(
      { session_id: `${LEGAL_DEMO_SEED_KEY}:${key}` },
      {
        user_id: userKey ? access.userIds[userKey] : null,
        session_id: `${LEGAL_DEMO_SEED_KEY}:${key}`,
        ip_address: '127.0.0.1',
        user_agent: 'Benicio legal demo seeder',
        resource,
        action,
        context: 'tenant',
        resource_id: folderKey ? folderIds[folderKey] : null,
        method: 'POST',
        url: `/api/v1/${resource}`,
        request_data: null,
        result: 'granted',
        reason: 'Evento importante da fixture determinística',
        response_code: 200,
        metadata: seededMetadata({ importance: 'high' }),
        created_at: reference.minus({ days: 1 }),
        updated_at: reference.minus({ days: 1 }),
      },
      { client }
    )
  }

  return 154
}

export async function seedLegalDemoInfrastructure(
  client: QueryClientContract,
  access: LegalDemoAccessContext,
  clientIds: Record<LegalDemoClientKey, number>,
  folderIds: Record<LegalDemoFolderKey, number>
): Promise<LegalDemoInfrastructureSummary> {
  const permissionIds = await seedSpecialPermissions(client)
  await seedRolePermissions(client, permissionIds)
  const userPermissions = await seedDirectPermissions(client, access, permissionIds)
  const tokens = await seedAuthTokens(client, access)
  const standaloneFiles = await seedStandaloneFiles(client, access, clientIds)
  const rateLimits = await seedRateLimits(client, access)
  const auditLogs = await seedAuditLogs(client, access, folderIds)

  return {
    specialPermissions: legalDemoSpecialPermissions.length,
    userPermissions,
    ...tokens,
    standaloneFiles,
    rateLimits,
    auditLogs,
  }
}
