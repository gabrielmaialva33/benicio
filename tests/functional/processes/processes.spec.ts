import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'

import Client from '#modules/clients/models/client'
import Folder from '#modules/folders/models/folder'
import LegalProcess from '#modules/processes/models/process'
import Role from '#modules/roles/models/role'
import Tenant from '#modules/tenants/models/tenant'
import User from '#modules/users/models/user'
import IRole from '#modules/roles/interfaces/role_interface'
import { createLegalAdmin } from '#tests/helpers/legal_context'

const CNJ_A = '5144506-05.2026.8.09.0112'
const CNJ_B = '0000001-48.2026.8.09.0001'

async function createFolder(tenantId: number, suffix: string = '001') {
  const legalClient = await Client.create({
    tenant_id: tenantId,
    name: `Cliente ${suffix}`,
    document: suffix === '001' ? '12345678900' : '98765432100',
    person_type: 'individual',
    metadata: {},
  })
  const folder = await Folder.create({
    tenant_id: tenantId,
    code: `PROC-${suffix}`,
    title: `Pasta processual ${suffix}`,
    status: 'active',
    area: 'Cível Contencioso',
    client_id: legalClient.id,
    metadata: {},
  })

  return { legalClient, folder }
}

test.group('Processes API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('creates a canonical process with normalized CNJ, dates, money and parties', async ({
    client,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const { legalClient, folder } = await createFolder(tenant.id)

    const created = await client
      .post(`/api/v1/folders/${folder.id}/processes`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .json({
        cnj_number: CNJ_A,
        internal_code: 'INT-2026-001',
        status: 'active',
        instance: 'first',
        phase: 'knowledge',
        distribution_type: 'lottery',
        electronic: false,
        is_primary: true,
        nature: 'Ação de cobrança',
        action_type: 'Procedimento comum',
        tribunal: 'TJGO',
        judicial_body: '1ª Vara Cível',
        district: 'Goiânia',
        forum: 'Foro Central',
        court_division: '1ª Vara Cível',
        judge: 'Juízo responsável',
        case_value: '150000.50',
        costs: 120.5,
        distribution_date: '2026-05-04',
        entry_date: '2026-05-05',
        metadata: { source: 'manual' },
        parties: [
          {
            side: 'active',
            role: 'claimant',
            is_primary: true,
            name: 'Empresa Alfanumérica',
            document: 'AB12.CD34/EF56-01',
            person_type: 'company',
          },
          {
            side: 'passive',
            role: 'defendant',
            is_primary: true,
            name: 'Parte Contrária',
            document: '123.456.789-00',
          },
        ],
      })
      .loginAs(user)

    created.assertStatus(201)
    created.assertBodyContains({
      data: {
        tenant_id: tenant.id,
        folder_id: folder.id,
        cnj_number: '51445060520268090112',
        cnj_year: 2026,
        cnj_segment: '8',
        cnj_tribunal_code: '09',
        cnj_origin_code: '0112',
        electronic: false,
        is_primary: true,
        case_value: '150000.50',
        costs: '120.50',
        distribution_date: '2026-05-04',
        parties: [
          {
            side: 'active',
            document: 'AB12CD34EF5601',
            person_type: 'company',
          },
          {
            side: 'passive',
            document: '12345678900',
            person_type: 'individual',
          },
        ],
      },
    })
    const processId = created.body().data.id as number

    const listed = await client
      .get('/api/v1/processes')
      .header('x-tenant-id', String(tenant.id))
      .qs({
        cnj_number: CNJ_A,
        party_document: '123.456.789-00',
        client_id: legalClient.id,
        electronic: false,
      })
      .loginAs(user)
    listed.assertStatus(200)
    assert.equal(listed.body().data.length, 1)
    assert.equal(listed.body().data[0].id, processId)

    const nested = await client
      .get(`/api/v1/folders/${folder.id}/processes`)
      .header('x-tenant-id', String(tenant.id))
      .qs({ search: 'Parte Contrária' })
      .loginAs(user)
    nested.assertStatus(200)
    assert.deepEqual(
      nested.body().data.map((process: { id: number }) => process.id),
      [processId]
    )
  })

  test('replaces nested parties, merges metadata and accepts explicit unknown values', async ({
    client,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const { folder } = await createFolder(tenant.id)

    const created = await client
      .post(`/api/v1/folders/${folder.id}/processes`)
      .header('x-tenant-id', String(tenant.id))
      .json({
        cnj_number: CNJ_A,
        electronic: true,
        metadata: { source: 'manual' },
        parties: [{ side: 'active', name: 'Parte original' }],
      })
      .loginAs(user)
    created.assertStatus(201)
    const processId = created.body().data.id as number
    const originalPartyId = created.body().data.parties[0].id as number

    const updated = await client
      .put(`/api/v1/processes/${processId}`)
      .header('x-tenant-id', String(tenant.id))
      .json({
        electronic: null,
        metadata: { reviewed: true },
        parties: [{ side: 'passive', name: 'Parte substituta', is_primary: true }],
      })
      .loginAs(user)

    updated.assertStatus(200)
    updated.assertBodyContains({
      data: {
        electronic: null,
        metadata: { source: 'manual', reviewed: true },
        parties: [{ side: 'passive', name: 'Parte substituta', is_primary: true }],
      },
    })
    assert.lengthOf(updated.body().data.parties, 1)
    assert.notEqual(updated.body().data.parties[0].id, originalPartyId)
    assert.isNull(await db.from('process_parties').where('id', originalPartyId).first())
  })

  test('keeps one primary process per folder with an atomic idempotent endpoint', async ({
    client,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const { folder } = await createFolder(tenant.id)

    const create = (cnjNumber: string) =>
      client
        .post(`/api/v1/folders/${folder.id}/processes`)
        .header('x-tenant-id', String(tenant.id))
        .json({ cnj_number: cnjNumber, is_primary: true })
        .loginAs(user)

    const first = await create(CNJ_A)
    first.assertStatus(201)
    const second = await create(CNJ_B)
    second.assertStatus(201)

    const firstAfterCreate = await LegalProcess.findOrFail(first.body().data.id)
    const secondAfterCreate = await LegalProcess.findOrFail(second.body().data.id)
    assert.isFalse(firstAfterCreate.is_primary)
    assert.isTrue(secondAfterCreate.is_primary)

    const selected = await client
      .put(`/api/v1/processes/${firstAfterCreate.id}/primary`)
      .header('x-tenant-id', String(tenant.id))
      .loginAs(user)
    selected.assertStatus(200)
    selected.assertBodyContains({ data: { is_primary: true } })

    await secondAfterCreate.refresh()
    assert.isFalse(secondAfterCreate.is_primary)
    assert.equal(
      await db
        .from('processes')
        .where('tenant_id', tenant.id)
        .where('folder_id', folder.id)
        .where('is_primary', true)
        .whereNull('deleted_at')
        .count('* as total')
        .first()
        .then((row) => Number(row?.total)),
      1
    )
  })

  test('isolates tenants and enforces active CNJ uniqueness inside each tenant', async ({
    client,
  }) => {
    const { user, tenants } = await createLegalAdmin(2)
    const [tenantA, tenantB] = tenants
    const { folder: folderA } = await createFolder(tenantA.id, '001')
    const { folder: folderB } = await createFolder(tenantB.id, '002')

    const first = await client
      .post(`/api/v1/folders/${folderA.id}/processes`)
      .header('x-tenant-id', String(tenantA.id))
      .json({ cnj_number: CNJ_A })
      .loginAs(user)
    first.assertStatus(201)

    const duplicate = await client
      .post(`/api/v1/folders/${folderA.id}/processes`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .json({ cnj_number: CNJ_A })
      .loginAs(user)
    duplicate.assertStatus(409)

    const otherTenant = await client
      .post(`/api/v1/folders/${folderB.id}/processes`)
      .header('x-tenant-id', String(tenantB.id))
      .json({ cnj_number: CNJ_A })
      .loginAs(user)
    otherTenant.assertStatus(201)

    const hidden = await client
      .get(`/api/v1/processes/${first.body().data.id}`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantB.id))
      .loginAs(user)
    hidden.assertStatus(404)

    const wrongFolder = await client
      .post(`/api/v1/folders/${folderB.id}/processes`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .json({ cnj_number: CNJ_B })
      .loginAs(user)
    wrongFolder.assertStatus(404)
  })

  test('validates identifiers, CNJ check digits, party documents and primary parties', async ({
    client,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const { folder } = await createFolder(tenant.id)
    const request = (payload: Record<string, unknown>) =>
      client
        .post(`/api/v1/folders/${folder.id}/processes`)
        .header('Accept', 'application/json')
        .header('x-tenant-id', String(tenant.id))
        .json(payload)
        .loginAs(user)

    const noIdentifier = await request({ status: 'active' })
    noIdentifier.assertStatus(422)

    const invalidCnj = await request({ cnj_number: '5144506-06.2026.8.09.0112' })
    invalidCnj.assertStatus(422)

    const invalidParty = await request({
      legacy_number: 'LEGACY-001',
      parties: [
        {
          side: 'passive',
          name: 'Documento incompatível',
          document: '12345678900',
          person_type: 'company',
        },
      ],
    })
    invalidParty.assertStatus(422)

    const duplicatePrimary = await request({
      internal_code: 'INTERNAL-001',
      parties: [
        { side: 'active', name: 'Parte um', is_primary: true },
        { side: 'active', name: 'Parte dois', is_primary: true },
      ],
    })
    duplicatePrimary.assertStatus(422)
  })

  test('soft deletes processes, reuses their CNJ and blocks deleting folders with active cases', async ({
    client,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const { folder } = await createFolder(tenant.id)

    const created = await client
      .post(`/api/v1/folders/${folder.id}/processes`)
      .header('x-tenant-id', String(tenant.id))
      .json({ cnj_number: CNJ_A })
      .loginAs(user)
    created.assertStatus(201)
    const processId = created.body().data.id as number

    const blockedFolder = await client
      .delete(`/api/v1/folders/${folder.id}`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .loginAs(user)
    blockedFolder.assertStatus(409)

    const removed = await client
      .delete(`/api/v1/processes/${processId}`)
      .header('x-tenant-id', String(tenant.id))
      .loginAs(user)
    removed.assertStatus(204)
    const deletedProcess = await db.from('processes').where('id', processId).firstOrFail()
    assert.isNotNull(deletedProcess.deleted_at)

    const reused = await client
      .post(`/api/v1/folders/${folder.id}/processes`)
      .header('x-tenant-id', String(tenant.id))
      .json({ cnj_number: CNJ_A })
      .loginAs(user)
    reused.assertStatus(201)
  })

  test('grants regular users process work but keeps delete and guest access restricted', async ({
    client,
  }) => {
    const tenant = await Tenant.create({
      name: 'Process RBAC Tenant',
      slug: 'process-rbac-tenant',
      is_active: true,
    })
    const { folder } = await createFolder(tenant.id)
    const regularUser = await User.create({
      full_name: 'Regular Process User',
      email: 'regular-process@example.com',
      username: 'regular-process',
      password: 'password123',
    })
    await regularUser.related('tenants').attach({ [tenant.id]: { role: 'member' } })

    const created = await client
      .post(`/api/v1/folders/${folder.id}/processes`)
      .header('x-tenant-id', String(tenant.id))
      .json({ cnj_number: CNJ_A })
      .loginAs(regularUser)
    created.assertStatus(201)

    const deniedDelete = await client
      .delete(`/api/v1/processes/${created.body().data.id}`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .loginAs(regularUser)
    deniedDelete.assertStatus(403)

    const guest = await User.create({
      full_name: 'Process Guest',
      email: 'process-guest@example.com',
      username: 'process-guest',
      password: 'password123',
    })
    const guestRole = await Role.findByOrFail('slug', IRole.Slugs.GUEST)
    await guest.related('roles').sync([guestRole.id])
    await guest.related('tenants').attach({ [tenant.id]: { role: 'member' } })

    const deniedGuest = await client
      .get('/api/v1/processes')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .loginAs(guest)
    deniedGuest.assertStatus(403)
  })
})
