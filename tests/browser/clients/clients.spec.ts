import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import type { Page } from 'playwright'

import Client from '#modules/clients/models/client'
import Folder from '#modules/folders/models/folder'
import { createLegalAdmin } from '#tests/helpers/legal_context'

async function signIn(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[name="uid"]', email)
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]:has-text("Entrar")')
  await page.waitForURL('**/dashboard', { timeout: 30_000 })
}

test.group('Clients Inertia', () => {
  test('lists and opens only clients from the active tenant', async ({
    browserContext,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin(2)
    const [activeTenant, foreignTenant] = tenants
    const suffix = randomUUID().slice(0, 8).toUpperCase()
    const localClient = await Client.create({
      tenant_id: activeTenant.id,
      name: `Cliente Local ${suffix}`,
      document: '12345678900',
      person_type: 'individual',
      email: `local-${suffix.toLowerCase()}@example.com`,
      metadata: {},
    })
    const foreignClient = await Client.create({
      tenant_id: foreignTenant.id,
      name: `Cliente Externo ${suffix}`,
      document: '12345678900',
      person_type: 'individual',
      metadata: {},
    })
    const folder = await Folder.create({
      tenant_id: activeTenant.id,
      client_id: localClient.id,
      code: `CLI-${suffix}`,
      title: `Caso do cliente ${suffix}`,
      status: 'active',
      area: 'Cível',
      metadata: {},
    })

    const page = await browserContext.newPage()
    await signIn(page, user.email)
    await page.goto('/clients')
    await page.getByTestId('clients-index').waitFor()

    await page.locator('table').getByText(localClient.name, { exact: true }).waitFor()
    assert.equal(await page.getByText(foreignClient.name, { exact: true }).count(), 0)

    await page.fill('input[name="search"]', localClient.document)
    await page.getByRole('button', { name: 'Buscar' }).click()
    await page.waitForURL((url) => url.pathname === '/clients' && url.searchParams.has('search'))
    await page.locator('table').getByText(localClient.name, { exact: true }).waitFor()

    await page.locator(`table a[href="/clients/${localClient.id}"]`).first().click()
    await page.waitForURL(`**/clients/${localClient.id}`)
    await page.getByTestId('client-detail').waitFor()
    await page.getByText(localClient.name, { exact: true }).waitFor()
    await page.getByText(folder.code, { exact: true }).waitFor()
    await page.getByText(folder.title, { exact: true }).waitFor()
  })

  test('creates, edits and removes an unlinked client through Inertia', async ({
    browserContext,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const suffix = randomUUID().slice(0, 8).toUpperCase()
    const document = `AB12CD34EF${suffix.slice(0, 2)}01`
    const initialName = `Empresa Inertia ${suffix}`
    const updatedName = `Empresa Atualizada ${suffix}`

    const page = await browserContext.newPage()
    await signIn(page, user.email)
    await page.goto('/clients/create')
    await page.getByTestId('client-form').waitFor()

    await page.selectOption('select[name="person_type"]', 'company')
    await page.fill('input[name="name"]', initialName)
    await page.fill('input[name="document"]', document)
    await page.fill('input[name="email"]', `empresa-${suffix.toLowerCase()}@example.com`)
    await page.fill('input[name="phone"]', '+55 11 99999-0000')
    await page.fill('input[name="address.street"]', 'Avenida Paulista')
    await page.fill('input[name="address.number"]', '1000')
    await page.fill('input[name="address.city"]', 'São Paulo')
    await page.fill('input[name="address.state"]', 'sp')
    await page.fill('textarea[name="notes"]', 'Cadastro criado pelo fluxo web.')
    await page.getByRole('button', { name: 'Cadastrar cliente' }).click()

    await page.waitForURL(/\/clients\/\d+$/, { timeout: 30_000 })
    await page.getByText(initialName, { exact: true }).waitFor()
    await page.getByText(`Cliente ${initialName} cadastrado com sucesso.`).waitFor()

    const created = await Client.query()
      .where('tenant_id', tenant.id)
      .where('document', document)
      .firstOrFail()
    assert.equal(created.address?.state, 'SP')
    assert.equal(created.notes, 'Cadastro criado pelo fluxo web.')

    await page.getByRole('link', { name: 'Editar' }).click()
    await page.waitForURL(`**/clients/${created.id}/edit`)
    await page.fill('input[name="name"]', updatedName)
    await page.fill('textarea[name="notes"]', 'Cadastro revisado pelo fluxo web.')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()

    await page.waitForURL(`**/clients/${created.id}`)
    await page.getByText(updatedName, { exact: true }).waitFor()
    await page.getByText(`Cliente ${updatedName} atualizado com sucesso.`).waitFor()
    await created.refresh()
    assert.equal(created.name, updatedName)
    assert.equal(created.notes, 'Cadastro revisado pelo fluxo web.')

    await page.getByRole('button', { name: 'Excluir cliente' }).click()
    await page.getByRole('button', { name: 'Excluir cliente', exact: true }).last().click()
    await page.waitForURL('**/clients')
    await page.getByText('Cliente removido com sucesso.').waitFor()

    const deleted = await db.from('clients').where('id', created.id).firstOrFail()
    assert.isNotNull(deleted.deleted_at)
  })

  test('returns duplicate-document errors and blocks clients with active folders', async ({
    browserContext,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const suffix = randomUUID().slice(0, 8).toUpperCase()
    const existing = await Client.create({
      tenant_id: tenant.id,
      name: `Cliente Protegido ${suffix}`,
      document: '98765432100',
      person_type: 'individual',
      metadata: {},
    })
    await Folder.create({
      tenant_id: tenant.id,
      client_id: existing.id,
      code: `LOCK-${suffix}`,
      title: `Pasta ativa ${suffix}`,
      status: 'active',
      area: 'Empresarial',
      metadata: {},
    })

    const page = await browserContext.newPage()
    await signIn(page, user.email)
    await page.goto('/clients/create')
    await page.fill('input[name="name"]', `Duplicado ${suffix}`)
    await page.fill('input[name="document"]', existing.document)
    await page.getByRole('button', { name: 'Cadastrar cliente' }).click()

    await page.waitForURL('**/clients/create')
    await page.getByText('Já existe um cliente ativo com este documento.').waitFor()

    await page.goto(`/clients/${existing.id}`)
    await page.getByTestId('client-detail').waitFor()
    await page.getByRole('button', { name: 'Excluir cliente' }).click()
    await page.getByRole('button', { name: 'Excluir cliente', exact: true }).last().click()
    await page.waitForURL(`**/clients/${existing.id}`)
    await page
      .getByText(
        'Este cliente possui pastas ativas. Remova ou transfira essas pastas antes de excluí-lo.'
      )
      .waitFor()

    const protectedRow = await db.from('clients').where('id', existing.id).firstOrFail()
    assert.isNull(protectedRow.deleted_at)
  })
})
