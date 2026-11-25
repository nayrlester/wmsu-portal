import { test } from '@japa/runner'

test.group('Documents module (in-process)', () => {
  test('documents status is phase4 in-process on base-api', async ({ client, assert }) => {
    const res = await client.get('/api/v1/documents/_status')
    res.assertStatus(200)
    assert.equal(res.body().data.name, 'documents')
    assert.equal(res.body().data.prefix, '/api/v1/documents')
    assert.equal(res.body().data.schema, 'documents')
    assert.equal(res.body().data.mode, 'in-process')
    assert.equal(res.body().data.phase, 'phase4-in-process')
  })

  test('documents health reports in-process ok', async ({ client, assert }) => {
    const res = await client.get('/api/v1/documents/_health')
    res.assertStatus(200)
    assert.equal(res.body().data.ok, true)
    assert.equal(res.body().data.mode, 'in-process')
  })

  test('protected udms route rejects missing auth', async ({ client, assert }) => {
    const res = await client.get('/api/v1/documents/udms/foundation/status')
    assert.isTrue([401, 403].includes(res.status()))
  })
})
