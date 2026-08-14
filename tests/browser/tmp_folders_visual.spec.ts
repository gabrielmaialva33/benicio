import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import Activity from '#modules/activities/models/activity'
import Client from '#modules/clients/models/client'
import Deadline from '#modules/deadlines/models/deadline'
import Folder from '#modules/folders/models/folder'
import LegalProcess from '#modules/processes/models/process'
import Task from '#modules/tasks/models/task'
import { createLegalAdmin } from '#tests/helpers/legal_context'

test('captures the migrated folder screens', async ({ browserContext }) => {
  const { user, tenants } = await createLegalAdmin()
  const tenant = tenants[0]
  const now = DateTime.now()
  const legalClient = await Client.create({
    tenant_id: tenant.id,
    name: 'Grupo Horizonte',
    document: '12345678000195',
    person_type: 'company',
    email: 'juridico@horizonte.com.br',
    metadata: {},
  })
  const folder = await Folder.create({
    tenant_id: tenant.id,
    code: 'CIV-2026-0184',
    title: 'Ação indenizatória por descumprimento contratual',
    description:
      'Demanda estratégica envolvendo inadimplemento contratual e pedido de reparação por perdas e danos.',
    status: 'active',
    area: 'Cível',
    subarea: 'Contratos',
    client_id: legalClient.id,
    responsible_lawyer_id: user.id,
    metadata: {},
  })
  await Folder.create({
    tenant_id: tenant.id,
    code: 'TRAB-2026-0042',
    title: 'Reclamação trabalhista — unidade Sul',
    status: 'pending',
    area: 'Trabalhista',
    client_id: legalClient.id,
    responsible_lawyer_id: user.id,
    metadata: {},
  })
  const process = await LegalProcess.create({
    tenant_id: tenant.id,
    folder_id: folder.id,
    internal_code: 'PROC-0184',
    status: 'active',
    instance: 'first',
    phase: 'knowledge',
    is_primary: true,
    nature: 'Cível',
    action_type: 'Ação indenizatória',
    tribunal: 'TJSP',
    district: 'São Paulo',
    court_division: '12ª Vara Cível',
    case_value: '185000.00',
    entry_date: now,
    metadata: {},
  })
  await Task.create({
    tenant_id: tenant.id,
    folder_id: folder.id,
    process_id: process.id,
    creator_id: user.id,
    assignee_id: user.id,
    title: 'Preparar contestação e documentos',
    status: 'pending',
    priority: 'urgent',
    tags: [],
    metadata: {},
  })
  await Deadline.create({
    tenant_id: tenant.id,
    folder_id: folder.id,
    process_id: process.id,
    creator_id: user.id,
    assignee_id: user.id,
    title: 'Protocolar manifestação',
    kind: 'judicial',
    status: 'pending',
    priority: 'urgent',
    is_fatal: true,
    due_at: now.plus({ days: 4 }),
    metadata: {},
  })
  await Activity.create({
    tenant_id: tenant.id,
    folder_id: folder.id,
    process_id: process.id,
    actor_id: user.id,
    event_type: 'document.created',
    summary: 'Petição inicial adicionada',
    data: {},
    occurred_at: now,
  })

  const page = await browserContext.newPage()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/login')
  await page.fill('input[name="uid"]', user.email)
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]:has-text("Sign in")')
  await page.waitForURL('**/dashboard')

  await page.goto('/folders')
  await page.getByTestId('folders-index').waitFor()
  await page.screenshot({ path: '/tmp/benicio-folders-index.png', fullPage: true })

  await page.goto(`/folders/${folder.id}`)
  await page.getByTestId('folder-detail').waitFor()
  await page.screenshot({ path: '/tmp/benicio-folders-detail.png', fullPage: true })

  await page.goto('/folders/create')
  await page.getByTestId('folder-create-form').waitFor()
  await page.screenshot({ path: '/tmp/benicio-folders-create.png', fullPage: true })
})
