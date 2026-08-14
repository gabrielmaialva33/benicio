import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

import AiConversation from '#modules/ai/models/ai_conversation'
import AiChatService from '#modules/ai/services/ai_chat_service'
import AiProviderFactory from '#modules/ai/services/ai_provider_factory'
import AiConversationRepository from '#modules/ai/repositories/ai_conversation_repository'
import User from '#modules/users/models/user'
import type {
  AiProvider,
  AiProviderChunk,
  AiProviderMessage,
  AiProviderResult,
} from '#modules/ai/interfaces/ai_interface'
import { createLegalAdmin } from '#tests/helpers/legal_context'

class RecordingProvider implements AiProvider {
  readonly name = 'test'
  readonly model = 'test-model'
  readonly calls: AiProviderMessage[][] = []

  async generate(messages: AiProviderMessage[]): Promise<AiProviderResult> {
    this.calls.push(messages)
    return {
      content: 'Resposta persistida',
      provider: this.name,
      model: this.model,
      usage: { total_tokens: 12 },
    }
  }

  async *stream(messages: AiProviderMessage[]): AsyncGenerator<AiProviderChunk, void, void> {
    this.calls.push(messages)
    yield { content: 'Resposta ' }
    yield { content: 'em stream' }
  }
}

async function createTenantMember(tenantId: number) {
  const suffix = randomUUID()
  const user = await User.create({
    full_name: 'AI Member',
    email: `ai-member-${suffix}@example.com`,
    username: `ai-member-${suffix}`,
    password: 'password123',
  })
  await user.related('tenants').attach({ [tenantId]: { role: 'member' } })
  return user
}

test.group('AI chat API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('fails closed with 503 and creates no history when provider is disabled', async ({
    client,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]

    const chat = await client
      .post('/api/v1/ai/chat')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .json({ message: 'Explique este prazo' })
      .loginAs(user)
    chat.assertStatus(503)
    chat.assertBodyContains({ message: 'AI provider is disabled' })

    const stream = await client
      .post('/api/v1/ai/chat/stream')
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .json({ message: 'Explique este prazo' })
      .loginAs(user)
    stream.assertStatus(503)

    const count = await AiConversation.query()
      .where('tenant_id', tenant.id)
      .count('* as total')
      .firstOrFail()
    assert.equal(Number(count.$extras.total), 0)
  })

  test('persists responses, preserves the legacy contract and isolates conversation owners', async ({
    client,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const owner = await createTenantMember(tenant.id)
    const provider = new RecordingProvider()
    const repository = new AiConversationRepository()
    const service = new AiChatService(repository, AiProviderFactory.forProvider(provider))

    const first = await service.chat(tenant.id, owner.id, {
      message: 'Analise a prescrição intercorrente deste processo',
      mode: 'single',
    })
    assert.equal(first.message.role, 'assistant')
    assert.equal(first.message.content, 'Resposta persistida')
    assert.equal(first.conversation.user_id, owner.id)

    const streamEvents: string[] = []
    for await (const event of service.stream(tenant.id, owner.id, {
      message: 'Agora resuma em duas linhas',
      conversation_id: first.conversation.id,
    })) {
      streamEvents.push(event)
    }
    assert.include(streamEvents.join(''), 'data: {"content":"Resposta "}')
    assert.include(streamEvents.join(''), 'data: {"content":"em stream"}')
    assert.include(streamEvents.join(''), `"id":${first.conversation.id}`)
    assert.equal(streamEvents.at(-1), 'data: [DONE]\n\n')
    assert.deepEqual(
      provider.calls[1].map((message) => message.role),
      ['user', 'assistant', 'user']
    )

    const listed = await client
      .get('/api/v1/ai/conversations')
      .header('x-tenant-id', String(tenant.id))
      .loginAs(owner)
    listed.assertStatus(200)
    listed.assertBodyContains({
      data: [
        {
          id: first.conversation.id,
          user_id: owner.id,
          lastMessage: { role: 'assistant', content: 'Resposta em stream' },
        },
      ],
    })
    assert.exists(listed.body().meta)

    const shown = await client
      .get(`/api/v1/ai/conversations/${first.conversation.id}`)
      .header('x-tenant-id', String(tenant.id))
      .loginAs(owner)
    shown.assertStatus(200)
    assert.deepEqual(
      shown.body().data.messages.map((message: { role: string }) => message.role),
      ['user', 'assistant', 'user', 'assistant']
    )

    const hiddenFromOtherUser = await client
      .get(`/api/v1/ai/conversations/${first.conversation.id}`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .loginAs(user)
    hiddenFromOtherUser.assertStatus(404)

    const deleted = await client
      .delete(`/api/v1/ai/conversations/${first.conversation.id}`)
      .header('x-tenant-id', String(tenant.id))
      .loginAs(owner)
    deleted.assertStatus(204)

    const deletedConversation = await client
      .get(`/api/v1/ai/conversations/${first.conversation.id}`)
      .header('Accept', 'application/json')
      .header('x-tenant-id', String(tenant.id))
      .loginAs(owner)
    deletedConversation.assertStatus(404)
  })

  test('rejects concurrent turns for the same conversation', async ({ assert }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const repository = new AiConversationRepository()
    const provider = new RecordingProvider()
    const service = new AiChatService(repository, AiProviderFactory.forProvider(provider))

    const activeTurn = await repository.beginTurn(tenant.id, user.id, {
      message: 'Primeira pergunta',
    })

    await assert.rejects(
      () =>
        service.chat(tenant.id, user.id, {
          message: 'Segunda pergunta concorrente',
          conversation_id: activeTurn.conversation.id,
        }),
      'AI conversation is already generating a response'
    )
    await repository.failTurn(tenant.id, user.id, activeTurn.conversation.id, 'Test cleanup')
  })
})
