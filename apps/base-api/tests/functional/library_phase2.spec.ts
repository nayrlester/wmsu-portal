import { test } from '@japa/runner'

async function libraryReachable(): Promise<boolean> {
  try {
    const upstream = process.env.GATEWAY_LIBRARY_URL || 'http://127.0.0.1:3341'
    const res = await fetch(`${upstream}/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

test.group('Library Phase 2 façade', () => {
  test('library status describes ULMIS façade contracts', async ({ client, assert }) => {
    const res = await client.get('/api/v1/library/_status')
    res.assertStatus(200)
    assert.equal(res.body().data.phase, 'phase2-library-facade')
    assert.equal(res.body().data.module, 'library')
    assert.equal(res.body().data.torSystem, 'ULMIS')
    assert.equal(res.body().data.schemaTarget, 'library')
    assert.equal(res.body().data.entrypoints.facadePrefix, '/api/v1/library')
  })

  test('library health reports upstream availability', async ({ client, assert }) => {
    const res = await client.get('/api/v1/library/_health')
    assert.isTrue([200, 503].includes(res.status()))
    assert.property(res.body().data, 'upstream')
    assert.property(res.body().data, 'ok')
  })

  test('library foundation façade proxies when upstream is up', async ({ client, assert }) => {
    const up = await libraryReachable()
    if (!up) {
      assert.isTrue(true)
      return
    }

    const res = await client.get('/api/v1/library/ulmis/foundation/status')
    assert.isTrue([200, 401, 403].includes(res.status()))
    assert.isTrue(Boolean(res.header('x-wmsu-library-upstream')))
  })

  test('gateway library path remains available', async ({ client, assert }) => {
    const catalog = await client.get('/api/v1/gateway')
    catalog.assertStatus(200)
    const systems = catalog.body().data.systems as Array<{ system: string }>
    assert.isTrue(systems.some((s) => s.system === 'library'))
  })
})
