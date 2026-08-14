import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'

import Client from '#modules/clients/models/client'
import File from '#modules/files/models/file'
import Folder from '#modules/folders/models/folder'
import LegalProcess from '#modules/processes/models/process'
import User from '#modules/users/models/user'
import { createLegalAdmin } from '#tests/helpers/legal_context'

async function createMatter(tenantId: number, suffix: string) {
  const legalClient = await Client.create({
    tenant_id: tenantId,
    name: `Cliente ${suffix}`,
    document: suffix.padStart(11, '0').slice(-11),
    person_type: 'individual',
    metadata: {},
  })
  const folder = await Folder.create({
    tenant_id: tenantId,
    code: `DOCUMENT-${suffix}`,
    title: `Pasta ${suffix}`,
    status: 'active',
    area: 'Cível',
    client_id: legalClient.id,
    metadata: {},
  })
  const process = await LegalProcess.create({
    tenant_id: tenantId,
    folder_id: folder.id,
    internal_code: `DOCUMENT-PROC-${suffix}`,
    status: 'active',
    is_primary: true,
    metadata: {},
  })
  return { folder, process }
}

async function createFile(tenantId: number, ownerId: number, suffix: string) {
  return File.create({
    tenant_id: tenantId,
    owner_id: ownerId,
    client_name: `peticao-${suffix}`,
    file_name: `uploads/peticao-${suffix}.pdf`,
    file_size: 1_024,
    file_type: 'application/pdf',
    file_category: 'document',
    storage_disk: 'fs',
  })
}

test.group('Documents and folder favorites API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('links existing tenant files without duplicating blob metadata', async ({
    client,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const { folder, process } = await createMatter(tenant.id, '601')
    const file = await createFile(tenant.id, user.id, '601')

    const created = await client
      .post(`/api/v1/folders/${folder.id}/documents`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .json({
        process_id: process.id,
        file_id: file.id,
        document_type: 'petition',
        title: 'Petição inicial',
        version: 1,
        metadata: { source: 'manual' },
      })
      .loginAs(user)
    created.assertStatus(201)
    created.assertBodyContains({
      data: {
        tenant_id: tenant.id,
        folder_id: folder.id,
        process_id: process.id,
        file_id: file.id,
        created_by: user.id,
        document_type: 'petition',
        file: {
          id: file.id,
          url: file.url,
          file_type: 'application/pdf',
          file_size: 1_024,
        },
      },
    })
    const documentId = created.body().data.id as number

    const duplicate = await client
      .post(`/api/v1/folders/${folder.id}/documents`)
      .header('x-tenant-id', String(tenant.id))
      .json({
        process_id: process.id,
        file_id: file.id,
        document_type: 'petition',
        title: 'Não deve duplicar',
      })
      .loginAs(user)
    duplicate.assertStatus(201)
    assert.equal(duplicate.body().data.id, documentId)

    const updated = await client
      .put(`/api/v1/documents/${documentId}`)
      .header('x-tenant-id', String(tenant.id))
      .json({ is_signed: true, version: 2, metadata: { signed_by: 'client' } })
      .loginAs(user)
    updated.assertStatus(200)
    updated.assertBodyContains({
      data: {
        is_signed: true,
        version: 2,
        metadata: { source: 'manual', signed_by: 'client' },
      },
    })

    const listed = await client
      .get(`/api/v1/processes/${process.id}/documents`)
      .header('x-tenant-id', String(tenant.id))
      .qs({ document_type: 'petition', is_signed: true })
      .loginAs(user)
    listed.assertStatus(200)
    assert.deepEqual(
      listed.body().data.map((document: { id: number }) => document.id),
      [documentId]
    )

    const removed = await client
      .delete(`/api/v1/documents/${documentId}`)
      .header('x-tenant-id', String(tenant.id))
      .loginAs(user)
    removed.assertStatus(204)
    const deletedDocument = await db.from('legal_documents').where('id', documentId).firstOrFail()
    const activityCount = await db
      .from('activities')
      .where({ tenant_id: tenant.id })
      .count('*')
      .firstOrFail()
    assert.isNotNull(deletedDocument.deleted_at)
    assert.equal(Number(activityCount.count), 3)
  })

  test('rejects foreign files and mismatched process links', async ({ client }) => {
    const { user, tenants } = await createLegalAdmin(2)
    const [tenantA, tenantB] = tenants
    const matterA = await createMatter(tenantA.id, '611')
    const matterB = await createMatter(tenantB.id, '612')
    const fileA = await createFile(tenantA.id, user.id, '611')
    const fileB = await createFile(tenantB.id, user.id, '612')

    const foreignFile = await client
      .post(`/api/v1/folders/${matterA.folder.id}/documents`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .json({ file_id: fileB.id, document_type: 'proof', title: 'Arquivo externo' })
      .loginAs(user)
    foreignFile.assertStatus(404)

    const wrongProcess = await client
      .post(`/api/v1/folders/${matterA.folder.id}/documents`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .json({
        process_id: matterB.process.id,
        file_id: fileA.id,
        document_type: 'proof',
        title: 'Processo externo',
      })
      .loginAs(user)
    wrongProcess.assertStatus(404)
  })

  test('keeps folder favorites idempotent, per user and per tenant', async ({ client, assert }) => {
    const { user, tenants } = await createLegalAdmin(2)
    const [tenantA, tenantB] = tenants
    const matterA = await createMatter(tenantA.id, '621')
    const matterB = await createMatter(tenantB.id, '622')
    const otherUser = await User.create({
      full_name: 'Outro usuário',
      email: 'other-favorite@example.com',
      username: 'other-favorite',
      password: 'password123',
    })
    await otherUser.related('tenants').attach({ [tenantA.id]: { role: 'member' } })
    await db.table('folder_favorites').insert({
      tenant_id: tenantA.id,
      user_id: otherUser.id,
      folder_id: matterA.folder.id,
    })

    const favorite = () =>
      client
        .put(`/api/v1/folders/${matterA.folder.id}/favorite`)
        .header('x-tenant-id', String(tenantA.id))
        .loginAs(user)
    const firstFavorite = await favorite()
    const repeatedFavorite = await favorite()
    firstFavorite.assertStatus(200)
    repeatedFavorite.assertStatus(200)

    const listed = await client
      .get('/api/v1/me/favorites/folders')
      .header('x-tenant-id', String(tenantA.id))
      .loginAs(user)
    listed.assertStatus(200)
    assert.deepEqual(
      listed.body().data.map((folder: { id: number }) => folder.id),
      [matterA.folder.id]
    )
    const favoriteCount = await db
      .from('folder_favorites')
      .where({ tenant_id: tenantA.id, folder_id: matterA.folder.id })
      .count('*')
      .firstOrFail()
    assert.equal(Number(favoriteCount.count), 2)

    const foreignFolder = await client
      .put(`/api/v1/folders/${matterB.folder.id}/favorite`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .loginAs(user)
    foreignFolder.assertStatus(404)

    const removed = await client
      .delete(`/api/v1/folders/${matterA.folder.id}/favorite`)
      .header('x-tenant-id', String(tenantA.id))
      .loginAs(user)
    removed.assertStatus(200)
    removed.assertBodyContains({ data: { is_favorite: false } })
  })
})
