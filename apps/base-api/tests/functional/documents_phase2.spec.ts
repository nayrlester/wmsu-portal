import { test } from '@japa/runner'

async function documentsReachable(): Promise<boolean> {
  try {
    const upstream = process.env.GATEWAY_DOCUMENTS_URL || 'http://127.0.0.1:3343'
    const res = await fetch(`${upstream}/health/live`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

test.group('Documents Phase 2 façade', () => {
  test('documents status describes UDMS façade contracts', async ({ client, assert }) => {
    const res = await client.get('/api/v1/documents/_status')
    res.assertStatus(200)
    assert.equal(res.body().data.phase, 'phase2-documents-facade')
    assert.equal(res.body().data.module, 'documents')
    assert.equal(res.body().data.torSystem, 'UDMS')
    assert.equal(res.body().data.schemaTarget, 'documents')
    assert.equal(res.body().data.entrypoints.facadePrefix, '/api/v1/documents')
  })

  test('documents health reports upstream availability', async ({ client, assert }) => {
    const res = await client.get('/api/v1/documents/_health')
    assert.isTrue([200, 503].includes(res.status()))
    assert.property(res.body().data, 'upstream')
    assert.property(res.body().data, 'ok')
  })

  test('documents udms foundation façade proxies when upstream is up', async ({
    client,
    assert,
  }) => {
    const up = await documentsReachable()
    if (!up) {
      assert.isTrue(true)
      return
    }

    const res = await client.get('/api/v1/documents/udms/foundation/status')
    assert.isTrue([200, 401, 403].includes(res.status()))
    assert.isTrue(Boolean(res.header('x-wmsu-documents-upstream')))
  })

  test('gateway documents path remains available', async ({ client, assert }) => {
    const catalog = await client.get('/api/v1/gateway')
    catalog.assertStatus(200)
    const systems = catalog.body().data.systems as Array<{ system: string }>
    assert.isTrue(systems.some((s) => s.system === 'documents'))
  })
})
