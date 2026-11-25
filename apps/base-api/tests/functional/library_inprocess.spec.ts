import { test } from '@japa/runner'

test.group('Library module (in-process)', () => {
  test('library status is phase4 in-process on base-api', async ({ client, assert }) => {
    const res = await client.get('/api/v1/library/_status')
    res.assertStatus(200)
    assert.equal(res.body().data.name, 'library')
    assert.equal(res.body().data.prefix, '/api/v1/library')
    assert.equal(res.body().data.schema, 'library')
    assert.equal(res.body().data.mode, 'in-process')
    assert.equal(res.body().data.phase, 'phase4-in-process')
  })

  test('library health reports in-process ok', async ({ client, assert }) => {
    const res = await client.get('/api/v1/library/_health')
    res.assertStatus(200)
    assert.equal(res.body().data.ok, true)
    assert.equal(res.body().data.mode, 'in-process')
  })

  test('public docs respond without auth', async ({ client }) => {
    const res = await client.get('/api/v1/library/docs/openapi.yaml')
    res.assertStatus(200)
  })

  test('protected books route rejects missing auth', async ({ client, assert }) => {
    const res = await client.get('/api/v1/library/books').header('x-tenant-slug', 'ulmis')
    assert.isTrue(res.status() === 401 || res.status() === 403)
  })
})
