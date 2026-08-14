import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import type { Page } from 'playwright'

import type {
  AiProvider,
  AiProviderChunk,
  AiProviderMessage,
  AiProviderResult,
} from '#modules/ai/interfaces/ai_interface'
import AiConversationRepository from '#modules/ai/repositories/ai_conversation_repository'
import AiProviderFactory from '#modules/ai/services/ai_provider_factory'
import User from '#modules/users/models/user'
import { createLegalAdmin } from '#tests/helpers/legal_context'

class BrowserAiProvider implements AiProvider {
  readonly name = 'browser-test'
  readonly model = 'browser-test-model'

  async generate(messages: AiProviderMessage[]): Promise<AiProviderResult> {
    return {
      content: this.answerFor(messages),
      provider: this.name,
      model: this.model,
      usage: {},
    }
  }

  async *stream(messages: AiProviderMessage[]): AsyncGenerator<AiProviderChunk, void, void> {
    const answer = this.answerFor(messages)
    const splitAt = answer.indexOf(' em stream')
    yield { content: answer.slice(0, splitAt) }
    yield { content: answer.slice(splitAt) }
  }

  private answerFor(messages: AiProviderMessage[]) {
    const lastQuestion = messages.findLast((message) => message.role === 'user')?.content ?? ''
    return `Resposta **jurídica** em stream para: ${lastQuestion}`
  }
}

async function signIn(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[name="uid"]', email)
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]:has-text("Sign in")')
  await page.waitForURL('**/dashboard', { timeout: 30_000 })
}

async function createTenantMember(tenantId: number) {
  const suffix = randomUUID()
  const user = await User.create({
    full_name: 'Chat Member',
    email: `chat-member-${suffix}@example.com`,
    username: `chat-member-${suffix}`,
    password: 'password123',
  })
  await user.related('tenants').attach({ [tenantId]: { role: 'member' } })
  return user
}

test.group('Chat Inertia', (group) => {
  group.each.setup(() => {
    app.container.swap(AiProviderFactory, () =>
      AiProviderFactory.forProvider(new BrowserAiProvider())
    )
  })

  group.each.teardown(() => {
    app.container.restore(AiProviderFactory)
  })

  test('streams a new conversation, continues it and persists the complete history', async ({
    browserContext,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const firstQuestion = `Analise o prazo ${randomUUID().slice(0, 8)}`
    const secondQuestion = 'Agora resuma o risco em uma linha'
    const page = await browserContext.newPage()

    await signIn(page, user.email)
    await page.goto('/chat')
    await page.getByTestId('chat-page').waitFor()
    await page.getByRole('textbox', { name: 'Mensagem para a IA' }).fill(firstQuestion)
    await page.getByRole('button', { name: 'Enviar mensagem' }).click()

    await page.waitForURL(/\/chat\/\d+$/, { timeout: 30_000 })
    await page.getByTestId('chat-message-user').getByText(firstQuestion, { exact: true }).waitFor()
    const firstAnswer = page.getByTestId('chat-message-assistant').last()
    await firstAnswer.getByText('jurídica', { exact: true }).waitFor()
    await firstAnswer.getByText(`em stream para: ${firstQuestion}`).waitFor()

    const conversationId = Number(new URL(page.url()).pathname.split('/').at(-1))
    const persistedAfterFirstTurn = await db
      .from('ai_messages')
      .where('tenant_id', tenant.id)
      .where('conversation_id', conversationId)
      .orderBy('id')
    assert.deepEqual(
      persistedAfterFirstTurn.map((message) => message.role),
      ['user', 'assistant']
    )

    await page.getByRole('textbox', { name: 'Mensagem para a IA' }).fill(secondQuestion)
    await page.getByRole('button', { name: 'Enviar mensagem' }).click()
    await page
      .getByTestId('chat-message-assistant')
      .last()
      .getByText(`em stream para: ${secondQuestion}`)
      .waitFor({ timeout: 30_000 })
    await page.getByTestId('chat-message-assistant').nth(1).waitFor()

    const persistedAfterSecondTurn = await db
      .from('ai_messages')
      .where('tenant_id', tenant.id)
      .where('conversation_id', conversationId)
      .orderBy('id')
    assert.deepEqual(
      persistedAfterSecondTurn.map((message) => message.role),
      ['user', 'assistant', 'user', 'assistant']
    )
    assert.equal(persistedAfterSecondTurn.at(-1)?.provider, 'browser-test')

    await page.getByRole('button', { name: 'Excluir conversa atual' }).click()
    await page.getByRole('button', { name: 'Excluir conversa', exact: true }).click()
    await page.waitForURL('**/chat')
    await page.getByText('Conversa removida com sucesso.').waitFor()

    const deleted = await db.from('ai_conversations').where('id', conversationId).firstOrFail()
    assert.isNotNull(deleted.deleted_at)
  })

  test('hides conversations owned by another user in the same tenant', async ({
    browserContext,
    assert,
  }) => {
    const { user, tenants } = await createLegalAdmin()
    const tenant = tenants[0]
    const otherUser = await createTenantMember(tenant.id)
    const repository = new AiConversationRepository()
    const foreignConversation = await repository.beginTurn(tenant.id, otherUser.id, {
      message: 'Conversa privada de outro usuário',
    })
    await repository.completeTurn(tenant.id, otherUser.id, foreignConversation.id, {
      content: 'Resposta privada',
      provider: 'fixture',
      model: 'fixture',
      usage: {},
    })

    const page = await browserContext.newPage()
    await signIn(page, user.email)
    const response = await page.goto(`/chat/${foreignConversation.id}`, {
      waitUntil: 'domcontentloaded',
    })

    assert.equal(response?.status(), 404)
  })
})
