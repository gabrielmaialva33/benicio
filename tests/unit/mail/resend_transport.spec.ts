import { createServer, type Server } from 'node:http'

import { Message } from '@adonisjs/mail'
import { ResendTransport } from '@adonisjs/mail/transports/resend'
import { test } from '@japa/runner'

interface CapturedRequest {
  authorization: string
  body: string
  method: string
  url: string
}

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Could not resolve the Resend test server address')
  }

  return address.port
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

test.group('Resend mail transport', () => {
  test('sends the Adonis mail payload to the Resend API contract', async ({ assert }) => {
    let capturedRequest: CapturedRequest | undefined
    const server = createServer(async (request, response) => {
      let body = ''
      request.setEncoding('utf8')

      for await (const chunk of request) {
        body += chunk
      }

      capturedRequest = {
        authorization: request.headers.authorization ?? '',
        body,
        method: request.method ?? '',
        url: request.url ?? '',
      }

      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ id: 'email_test_123' }))
    })
    const port = await listen(server)

    try {
      const transport = new ResendTransport({
        key: 'test-api-key',
        baseUrl: `http://127.0.0.1:${port}`,
      })
      const message = new Message()
        .from('noreply@benicio.juridicai.com.br', 'Benício')
        .to('cliente@example.com')
        .subject('Confirmação de cadastro')
        .html('<p>Cadastro confirmado.</p>')

      const result = await transport.send(message.toJSON().message)
      const requestData = capturedRequest
      if (!requestData) {
        throw new Error('The Resend test server did not receive a request')
      }
      const payload = JSON.parse(requestData.body) as Record<string, unknown>

      assert.equal(result.messageId, 'email_test_123')
      assert.equal(requestData.method, 'POST')
      assert.equal(requestData.url, '/emails')
      assert.equal(requestData.authorization, 'Bearer test-api-key')
      assert.equal(payload.from, 'Benício <noreply@benicio.juridicai.com.br>')
      assert.deepEqual(payload.to, ['cliente@example.com'])
      assert.equal(payload.subject, 'Confirmação de cadastro')
      assert.equal(payload.html, '<p>Cadastro confirmado.</p>')
    } finally {
      await close(server)
    }
  })
})
