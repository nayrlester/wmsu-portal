import { test } from '@japa/runner'

test.group('Health endpoints', () => {
  test('live returns alive', async ({ client }) => {
    const response = await client.get('/api/v1/health/live')
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
  })
})
