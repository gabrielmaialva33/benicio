import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import type { Page } from 'playwright'

import Activity from '#modules/activities/models/activity'
import Client from '#modules/clients/models/client'
import Deadline from '#modules/deadlines/models/deadline'
import Folder from '#modules/folders/models/folder'
import LegalProcess from '#modules/processes/models/process'
import Task from '#modules/tasks/models/task'
import { createLegalAdmin } from '#tests/helpers/legal_context'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.fill('input[name="uid"]', email)
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]:has-text("Sign in")')
  await page.waitForURL('**/dashboard', { timeout: 30_000 })
}

test.group('Folders Inertia', () => {
  test('lists only the active tenant folders and opens the real detail', async ({
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
      code: `WEB-${suffix}`,
      title: `Caso real ${suffix}`,
      description: 'Descrição carregada diretamente do backend.',
      status: 'active',
      area: 'Cível',
      subarea: 'Contratos',
      client_id: localClient.id,
      responsible_lawyer_id: user.id,
      metadata: {},
    })
    await Folder.create({
      tenant_id: foreignTenant.id,
      code: `FOREIGN-${suffix}`,
      title: `Caso externo ${suffix}`,
      status: 'active',
      area: 'Trabalhista',
      client_id: foreignClient.id,
      metadata: {},
    })
    const process = await LegalProcess.create({
      tenant_id: activeTenant.id,
      folder_id: folder.id,
      internal_code: `PROC-${suffix}`,
      status: 'active',
      instance: 'first',
      phase: 'knowledge',
      is_primary: true,
      nature: 'Cível',
      action_type: 'Ação indenizatória',
      metadata: {},
    })
    await Task.create({
      tenant_id: activeTenant.id,
      folder_id: folder.id,
      process_id: process.id,
      creator_id: user.id,
      assignee_id: user.id,
      title: `Tarefa ${suffix}`,
      status: 'pending',
      priority: 'high',
      tags: [],
      metadata: {},
    })
    await Deadline.create({
      tenant_id: activeTenant.id,
      folder_id: folder.id,
      process_id: process.id,
      creator_id: user.id,
      assignee_id: user.id,
      title: `Prazo ${suffix}`,
      kind: 'judicial',
      status: 'pending',
      priority: 'urgent',
      is_fatal: true,
      due_at: folder.created_at.plus({ days: 5 }),
      metadata: {},
    })
    await Activity.create({
      tenant_id: activeTenant.id,
      folder_id: folder.id,
      process_id: process.id,
      actor_id: user.id,
      event_type: 'process.created',
      summary: `Processo ${suffix} cadastrado`,
      data: {},
      occurred_at: folder.created_at,
    })

    const page = await browserContext.newPage()
    await signIn(page, user.email)
    await page.goto('/folders')
    await page.getByTestId('folders-index').waitFor()

    await page.locator('table').getByText(folder.code, { exact: true }).waitFor()
    assert.equal(await page.getByText(`FOREIGN-${suffix}`, { exact: true }).count(), 0)

    await page.locator(`table a[href="/folders/${folder.id}"]`).first().click()
    await page.waitForURL(`**/folders/${folder.id}`)
    await page.getByTestId('folder-detail').waitFor()
    await page.getByText(folder.title, { exact: true }).waitFor()
    await page.getByText(`PROC-${suffix}`, { exact: true }).waitFor()
    await page.getByText(`Prazo ${suffix}`).waitFor()
    await page.getByText(`Processo ${suffix} cadastrado`, { exact: true }).waitFor()
  })

  test('creates a tenant-scoped folder through the Inertia form', async ({
    browserContext,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const suffix = randomUUID().slice(0, 8).toUpperCase()
    const legalClient = await Client.create({
      tenant_id: tenant.id,
      name: `Cliente Cadastro ${suffix}`,
      document: '98765432100',
      person_type: 'individual',
      metadata: {},
    })

    const page = await browserContext.newPage()
    await signIn(page, user.email)
    await page.goto('/folders/create')
    await page.getByTestId('folder-create-form').waitFor()

    await page.fill('input[name="code"]', `cad-${suffix}`)
    await page.fill('input[name="title"]', `Nova pasta ${suffix}`)
    await page.fill('input[name="area"]', 'Empresarial')
    await page.fill('input[name="subarea"]', 'Societário')
    await page.selectOption('select[name="client_id"]', String(legalClient.id))
    await page.selectOption('select[name="responsible_lawyer_id"]', String(user.id))
    await page.fill('textarea[name="description"]', 'Pasta criada pelo fluxo Inertia.')
    await page.getByRole('button', { name: 'Salvar pasta' }).click()

    await page.waitForURL(/\/folders\/\d+$/, { timeout: 30_000 })
    await page.getByText(`CAD-${suffix}`, { exact: true }).first().waitFor()
    await page.getByText('Pasta criada pelo fluxo Inertia.').waitFor()
    await page.getByText(`Pasta CAD-${suffix} criada com sucesso.`).waitFor()

    const created = await Folder.query()
      .where('tenant_id', tenant.id)
      .where('code', `CAD-${suffix}`)
      .firstOrFail()
    assert.equal(created.client_id, legalClient.id)
    assert.equal(created.responsible_lawyer_id, user.id)
    assert.equal(created.area, 'Empresarial')
  })

  test('returns server validation and duplicate-code errors to their fields', async ({
    browserContext,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const suffix = randomUUID().slice(0, 8).toUpperCase()
    const legalClient = await Client.create({
      tenant_id: tenant.id,
      name: `Cliente Validação ${suffix}`,
      document: '45678912300',
      person_type: 'individual',
      metadata: {},
    })
    await Folder.create({
      tenant_id: tenant.id,
      code: `DUP-${suffix}`,
      title: 'Pasta existente',
      status: 'active',
      area: 'Cível',
      client_id: legalClient.id,
      metadata: {},
    })

    const page = await browserContext.newPage()
    await signIn(page, user.email)
    await page.goto('/folders/create')

    await page.fill('input[name="code"]', `DUP-${suffix}`)
    await page.fill('input[name="title"]', 'x')
    await page.fill('input[name="area"]', 'Cível')
    await page.selectOption('select[name="client_id"]', String(legalClient.id))
    await page.getByRole('button', { name: 'Salvar pasta' }).click()

    await page.waitForURL('**/folders/create')
    await page.locator('#title-error').waitFor()

    await page.fill('input[name="title"]', 'Título válido')
    await page.getByRole('button', { name: 'Salvar pasta' }).click()
    await page.waitForURL('**/folders/create')
    await page.getByText('Já existe uma pasta ativa com este código.').waitFor()
  })
})
