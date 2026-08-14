import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

import Role from '#modules/roles/models/role'
import User from '#modules/users/models/user'
import IRole from '#modules/roles/interfaces/role_interface'
import { createLegalAdmin } from '#tests/helpers/legal_context'

async function createTenantAdmin(tenantId: number, suffix: string) {
  const user = await User.create({
    full_name: `Recipient ${suffix}`,
    email: `recipient-${suffix}@example.com`,
    username: `recipient-${suffix}`,
    password: 'password123',
  })
  const adminRole = await Role.findByOrFail('slug', IRole.Slugs.ADMIN)
  await user.related('roles').sync([adminRole.id])
  await user.related('tenants').attach({ [tenantId]: { role: 'admin' } })
  return user
}

test.group('Notifications, messages and realtime API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('delivers and owns notification lifecycle per tenant recipient', async ({
    client,
    assert,
  }) => {
    const { user: sender, tenants } = await createLegalAdmin(2)
    const [tenantA, tenantB] = tenants
    const recipient = await createTenantAdmin(tenantA.id, 'notification')

    const created = await client
      .post('/api/v1/notifications')
      .header('x-tenant-id', String(tenantA.id))
      .json({
        recipient_id: recipient.id,
        type: 'deadline',
        title: 'Prazo próximo',
        message: 'O prazo vence amanhã',
        action_url: 'https://app.example.test/deadlines/1',
        action_text: 'Abrir prazo',
        data: { deadline_id: 1 },
      })
      .loginAs(sender)
    created.assertStatus(201)
    created.assertBodyContains({
      data: {
        tenant_id: tenantA.id,
        recipient_id: recipient.id,
        actor_id: sender.id,
        type: 'deadline',
        read_at: null,
      },
    })
    const notificationId = created.body().data.id as number

    const senderCannotRead = await client
      .get(`/api/v1/notifications/${notificationId}`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantA.id))
      .loginAs(sender)
    senderCannotRead.assertStatus(404)

    const unread = await client
      .get('/api/v1/notifications/unread-count')
      .header('x-tenant-id', String(tenantA.id))
      .loginAs(recipient)
    unread.assertStatus(200)
    unread.assertBodyContains({ data: { count: 1 } })

    const read = await client
      .put(`/api/v1/notifications/${notificationId}/read`)
      .header('x-tenant-id', String(tenantA.id))
      .loginAs(recipient)
    read.assertStatus(200)
    assert.isNotNull(read.body().data.read_at)

    const deleted = await client
      .delete(`/api/v1/notifications/${notificationId}`)
      .header('x-tenant-id', String(tenantA.id))
      .loginAs(recipient)
    deleted.assertStatus(204)

    const foreignTenant = await client
      .post('/api/v1/notifications')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenantB.id))
      .json({ recipient_id: recipient.id, title: 'Fora do tenant', message: 'Não pode' })
      .loginAs(sender)
    foreignTenant.assertStatus(404)
  })

  test('supports inbox, sent box, unread counts and recipient-only mutations', async ({
    client,
    assert,
  }) => {
    const { user: sender, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const recipient = await createTenantAdmin(tenant.id, 'message')

    const created = await client
      .post('/api/v1/messages')
      .header('x-tenant-id', String(tenant.id))
      .json({
        recipient_id: recipient.id,
        subject: 'Audiência confirmada',
        body: 'A audiência foi confirmada para amanhã.',
        priority: 'high',
        metadata: { hearing_id: 42 },
      })
      .loginAs(sender)
    created.assertStatus(201)
    created.assertBodyContains({
      data: {
        tenant_id: tenant.id,
        sender_id: sender.id,
        recipient_id: recipient.id,
        priority: 'high',
        read_at: null,
      },
    })
    const messageId = created.body().data.id as number

    const sent = await client
      .get('/api/v1/messages')
      .header('x-tenant-id', String(tenant.id))
      .qs({ box: 'sent' })
      .loginAs(sender)
    sent.assertStatus(200)
    assert.deepEqual(
      sent.body().data.map((message: { id: number }) => message.id),
      [messageId]
    )

    const senderCannotMarkRead = await client
      .put(`/api/v1/messages/${messageId}/read`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .loginAs(sender)
    senderCannotMarkRead.assertStatus(404)

    const inbox = await client
      .get('/api/v1/messages')
      .header('x-tenant-id', String(tenant.id))
      .qs({ box: 'inbox', unread: true, priority: 'high' })
      .loginAs(recipient)
    inbox.assertStatus(200)
    assert.deepEqual(
      inbox.body().data.map((message: { id: number }) => message.id),
      [messageId]
    )

    const unread = await client
      .get('/api/v1/messages/unread-count')
      .header('x-tenant-id', String(tenant.id))
      .loginAs(recipient)
    unread.assertBodyContains({ data: { count: 1 } })

    const readAll = await client
      .put('/api/v1/messages/read-all')
      .header('x-tenant-id', String(tenant.id))
      .loginAs(recipient)
    readAll.assertStatus(200)
    readAll.assertBodyContains({ data: { updated: 1 } })

    const removed = await client
      .delete(`/api/v1/messages/${messageId}`)
      .header('x-tenant-id', String(tenant.id))
      .loginAs(recipient)
    removed.assertStatus(204)
  })

  test('protects Transmit transport routes with application auth', async ({ client }) => {
    const response = await client
      .post('/__transmit/subscribe')
      .header('Accept', 'application/json')
      .json({ uid: 'anonymous', channel: 'tenants/1/activity' })
      .redirects(0)
    response.assertStatus(401)
  })
})
