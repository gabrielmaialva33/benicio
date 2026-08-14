import { test } from '@japa/runner'

import { createLegalAdmin } from '#tests/helpers/legal_context'

test.group('Web root entrypoint', () => {
  test('sends guests to login and authenticated users to the dashboard', async ({ client }) => {
    const guest = await client.get('/').redirects(0)
    guest.assertStatus(302)
    guest.assertHeader('location', '/login')

    const { user } = await createLegalAdmin()
    const authenticated = await client.get('/').loginAs(user).redirects(0)
    authenticated.assertStatus(302)
    authenticated.assertHeader('location', '/dashboard')
  })
})
