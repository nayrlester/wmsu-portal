import { test } from '@japa/runner'

async function recordsReachable(): Promise<boolean> {
  try {
    const upstream = process.env.GATEWAY_RECORDS_URL || 'http://127.0.0.1:3345'
    const res = await fetch(`${upstream}/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

test.group('Records Phase 2 façade', () => {
  test('records status describes TORMS façade contracts', async ({ client, assert }) => {
    const res = await client.get('/api/v1/records/_status')
    res.assertStatus(200)
    assert.equal(res.body().data.phase, 'phase2-records-facade')
    assert.equal(res.body().data.module, 'records')
    assert.equal(res.body().data.torSystem, 'TORMS')
    assert.equal(res.body().data.schemaTarget, 'records')
    assert.equal(res.body().data.entrypoints.facadePrefix, '/api/v1/records')
  })

  test('records health reports upstream availability', async ({ client, assert }) => {
    const res = await client.get('/api/v1/records/_health')
    assert.isTrue([200, 503].includes(res.status()))
    assert.property(res.body().data, 'upstream')
    assert.property(res.body().data, 'ok')
  })

  test('records torms foundation façade proxies when upstream is up', async ({ client, assert }) => {
    const up = await recordsReachable()
    if (!up) {
      assert.isTrue(true)
      return
    }

    const res = await client.get('/api/v1/records/torms/foundation/status')
    assert.isTrue([200, 401, 403].includes(res.status()))
    assert.isTrue(Boolean(res.header('x-wmsu-records-upstream')))
  })

  test('gateway records path remains available', async ({ client, assert }) => {
    const catalog = await client.get('/api/v1/gateway')
    catalog.assertStatus(200)
    const systems = catalog.body().data.systems as Array<{ system: string }>
    assert.isTrue(systems.some((s) => s.system === 'records'))
  })
})
