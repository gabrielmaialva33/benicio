import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import type { Page } from 'playwright'

import Client from '#modules/clients/models/client'
import Folder from '#modules/folders/models/folder'
import LegalProcess from '#modules/processes/models/process'
import ProcessParty from '#modules/processes/models/process_party'
import { createLegalAdmin } from '#tests/helpers/legal_context'

async function signIn(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[name="uid"]', email)
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]:has-text("Sign in")')
  await page.waitForURL('**/dashboard', { timeout: 30_000 })
}

async function createFolder(tenantId: number, suffix: string) {
  const client = await Client.create({
    tenant_id: tenantId,
    name: `Cliente Processo ${suffix}`,
    document: randomUUID().replace(/\D/g, '').slice(0, 11).padEnd(11, '0'),
    person_type: 'individual',
    metadata: {},
  })
  const folder = await Folder.create({
    tenant_id: tenantId,
    client_id: client.id,
    code: `PROC-${suffix}`,
    title: `Pasta processual ${suffix}`,
    status: 'active',
    area: 'Cível',
    metadata: {},
  })
  return { client, folder }
}

test.group('Processes Inertia', () => {
  test('creates a complete folder process with persisted parties', async ({
    browserContext,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const suffix = randomUUID().slice(0, 8).toUpperCase()
    const { folder } = await createFolder(tenant.id, suffix)
    const internalCode = `WEB-${suffix}`

    const page = await browserContext.newPage()
    await signIn(page, user.email)
    await page.goto(`/folders/${folder.id}`)
    await page.getByTestId('folder-detail').waitFor()
    await page.getByRole('link', { name: 'Novo processo' }).click()
    await page.waitForURL(`**/folders/${folder.id}/processes/create`)
    await page.getByTestId('process-form').waitFor()

    await page.fill('input[name="internal_code"]', internalCode)
    await page.selectOption('select[name="instance"]', 'first')
    await page.selectOption('select[name="phase"]', 'knowledge')
    await page.selectOption('select[name="distribution_type"]', 'lottery')
    await page.selectOption('select[name="electronic"]', 'true')
    await page.check('input[name="is_primary"]')
    await page.fill('input[name="nature"]', 'Cível')
    await page.fill('input[name="action_type"]', 'Ação de cobrança')
    await page.fill('input[name="tribunal"]', 'TJSP')
    await page.fill('input[name="district"]', 'São Paulo')
    await page.fill('input[name="court_division"]', '10ª Vara Cível')
    await page.fill('input[name="distribution_date"]', '2026-08-14')
    await page.fill('input[name="entry_date"]', '2026-08-15')
    await page.fill('input[name="case_value"]', '25000.50')
    await page.fill('textarea[name="observation"]', 'Processo cadastrado pelo fluxo Inertia.')

    await page.getByRole('button', { name: 'Adicionar parte' }).click()
    await page.fill('input[name="parties.0.name"]', `Empresa Autora ${suffix}`)
    await page.fill('input[name="parties.0.role"]', 'Autora')
    await page.selectOption('select[name="parties.0.person_type"]', 'company')
    await page.fill('input[name="parties.0.document"]', '12.345.678/0001-95')
    await page.check('input[name="parties.0.is_primary"]')

    await page.getByRole('button', { name: 'Adicionar parte' }).click()
    await page.fill('input[name="parties.1.name"]', `Pessoa Ré ${suffix}`)
    await page.fill('input[name="parties.1.role"]', 'Ré')
    await page.selectOption('select[name="parties.1.person_type"]', 'individual')
    await page.fill('input[name="parties.1.document"]', '987.654.321-00')
    await page.check('input[name="parties.1.is_primary"]')

    await page.getByRole('button', { name: 'Cadastrar processo' }).click()

    await page.waitForURL(new RegExp(`/folders/${folder.id}/processes/\\d+$`), {
      timeout: 30_000,
    })
    await page.getByTestId('process-detail').waitFor()
    await page.getByRole('heading', { name: internalCode, exact: true }).waitFor()
    await page.getByText('Processo cadastrado com sucesso.').waitFor()
    await page.getByText(`Empresa Autora ${suffix}`, { exact: true }).waitFor()
    await page.getByText(`Pessoa Ré ${suffix}`, { exact: true }).waitFor()

    const created = await LegalProcess.query()
      .where('tenant_id', tenant.id)
      .where('folder_id', folder.id)
      .where('internal_code', internalCode)
      .preload('parties')
      .firstOrFail()
    assert.isTrue(created.is_primary)
    assert.isTrue(created.electronic)
    assert.equal(created.case_value, '25000.50')
    assert.equal(created.parties.length, 2)
    assert.deepEqual(created.parties.map((party) => party.document).sort(), [
      '12345678000195',
      '98765432100',
    ])
  })

  test('edits, marks primary atomically and soft deletes a process', async ({
    browserContext,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const suffix = randomUUID().slice(0, 8).toUpperCase()
    const { folder } = await createFolder(tenant.id, suffix)
    const first = await LegalProcess.create({
      tenant_id: tenant.id,
      folder_id: folder.id,
      internal_code: `FIRST-${suffix}`,
      status: 'active',
      is_primary: true,
      metadata: {},
    })
    const second = await LegalProcess.create({
      tenant_id: tenant.id,
      folder_id: folder.id,
      internal_code: `SECOND-${suffix}`,
      status: 'active',
      is_primary: false,
      metadata: {},
    })
    await ProcessParty.create({
      tenant_id: tenant.id,
      process_id: second.id,
      side: 'active',
      role: 'Autora',
      is_primary: true,
      name: `Parte Original ${suffix}`,
      document: null,
      person_type: null,
      metadata: {},
    })

    const page = await browserContext.newPage()
    await signIn(page, user.email)
    await page.goto(`/folders/${folder.id}/processes/${second.id}`)
    await page.getByTestId('process-detail').waitFor()
    await page.getByRole('link', { name: 'Editar' }).click()
    await page.waitForURL(`**/folders/${folder.id}/processes/${second.id}/edit`)

    await page.selectOption('select[name="status"]', 'suspended')
    await page.fill('input[name="parties.0.name"]', `Parte Revisada ${suffix}`)
    await page.fill('textarea[name="observation"]', 'Processo suspenso para diligência.')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()

    await page.waitForURL(`**/folders/${folder.id}/processes/${second.id}`)
    await page.getByText('Processo atualizado com sucesso.').waitFor()
    await page.getByText('Suspenso', { exact: true }).waitFor()
    await page.getByText(`Parte Revisada ${suffix}`, { exact: true }).waitFor()

    await page.getByRole('button', { name: 'Tornar principal' }).click()
    await page.getByText('Processo definido como principal da pasta.').waitFor()
    await first.refresh()
    await second.refresh()
    assert.isFalse(first.is_primary)
    assert.isTrue(second.is_primary)

    await page.getByRole('button', { name: 'Excluir processo' }).click()
    await page.getByRole('button', { name: 'Excluir processo', exact: true }).last().click()
    await page.waitForURL(`**/folders/${folder.id}`)
    await page.getByText('Processo removido com sucesso.').waitFor()

    const deleted = await db.from('processes').where('id', second.id).firstOrFail()
    assert.isNotNull(deleted.deleted_at)
    assert.isFalse(deleted.is_primary)
  })

  test('validates identifiers and rejects crossed folder or tenant routes', async ({
    browserContext,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin(2)
    const [activeTenant, foreignTenant] = tenants
    const suffix = randomUUID().slice(0, 8).toUpperCase()
    const { folder: activeFolder } = await createFolder(activeTenant.id, `A${suffix}`)
    const { folder: siblingFolder } = await createFolder(activeTenant.id, `B${suffix}`)
    const { folder: foreignFolder } = await createFolder(foreignTenant.id, `F${suffix}`)
    const siblingProcess = await LegalProcess.create({
      tenant_id: activeTenant.id,
      folder_id: siblingFolder.id,
      internal_code: `CROSS-${suffix}`,
      status: 'active',
      is_primary: false,
      metadata: {},
    })

    const page = await browserContext.newPage()
    await signIn(page, user.email)
    await page.goto(`/folders/${activeFolder.id}/processes/create`)
    await page.getByRole('button', { name: 'Cadastrar processo' }).click()
    await page.waitForURL(`**/folders/${activeFolder.id}/processes/create`)
    await page.getByText('Informe o número CNJ, o número legado ou o código interno.').waitFor()

    const crossedFolder = await page.goto(
      `/folders/${activeFolder.id}/processes/${siblingProcess.id}`,
      { waitUntil: 'domcontentloaded' }
    )
    assert.equal(crossedFolder?.status(), 404)

    const crossedTenant = await page.goto(`/folders/${foreignFolder.id}/processes/create`, {
      waitUntil: 'domcontentloaded',
    })
    assert.equal(crossedTenant?.status(), 404)
  })
})
