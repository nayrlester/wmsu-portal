import { test } from '@japa/runner'

async function financeReachable(): Promise<boolean> {
  try {
    const upstream = process.env.GATEWAY_FINANCE_URL || 'http://127.0.0.1:3342'
    const res = await fetch(`${upstream}/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

test.group('Finance Phase 2 façade', () => {
  test('finance status describes UFMS façade contracts', async ({ client, assert }) => {
    const res = await client.get('/api/v1/finance/_status')
    res.assertStatus(200)
    assert.equal(res.body().data.phase, 'phase2-finance-facade')
    assert.equal(res.body().data.module, 'finance')
    assert.equal(res.body().data.torSystem, 'UFMS')
    assert.equal(res.body().data.schemaTarget, 'finance')
    assert.equal(res.body().data.entrypoints.facadePrefix, '/api/v1/finance')
  })

  test('finance health reports upstream availability', async ({ client, assert }) => {
    const res = await client.get('/api/v1/finance/_health')
    assert.isTrue([200, 503].includes(res.status()))
    assert.property(res.body().data, 'upstream')
    assert.property(res.body().data, 'ok')
  })

  test('finance ufms façade proxies when upstream is up', async ({ client, assert }) => {
    const up = await financeReachable()
    if (!up) {
      assert.isTrue(true)
      return
    }

    const res = await client.get('/api/v1/finance/ufms')
    assert.isTrue([200, 401, 403].includes(res.status()))
    assert.isTrue(Boolean(res.header('x-wmsu-finance-upstream')))
  })

  test('gateway finance path remains available', async ({ client, assert }) => {
    const catalog = await client.get('/api/v1/gateway')
    catalog.assertStatus(200)
    const systems = catalog.body().data.systems as Array<{ system: string }>
    assert.isTrue(systems.some((s) => s.system === 'finance'))
  })
})
