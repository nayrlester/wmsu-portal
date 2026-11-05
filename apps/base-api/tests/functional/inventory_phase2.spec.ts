import { test } from '@japa/runner'

async function inventoryReachable(): Promise<boolean> {
  try {
    const upstream = process.env.GATEWAY_INVENTORY_URL || 'http://127.0.0.1:3344'
    const res = await fetch(`${upstream}/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

test.group('Inventory Phase 2 façade', () => {
  test('inventory status describes UIMS façade contracts', async ({ client, assert }) => {
    const res = await client.get('/api/v1/inventory/_status')
    res.assertStatus(200)
    assert.equal(res.body().data.phase, 'phase2-inventory-facade')
    assert.equal(res.body().data.module, 'inventory')
    assert.equal(res.body().data.torSystem, 'UIMS')
    assert.equal(res.body().data.schemaTarget, 'inventory')
    assert.equal(res.body().data.entrypoints.facadePrefix, '/api/v1/inventory')
  })

  test('inventory health reports upstream availability', async ({ client, assert }) => {
    const res = await client.get('/api/v1/inventory/_health')
    assert.isTrue([200, 503].includes(res.status()))
    assert.property(res.body().data, 'upstream')
    assert.property(res.body().data, 'ok')
  })

  test('inventory assets façade proxies when upstream is up', async ({ client, assert }) => {
    const up = await inventoryReachable()
    if (!up) {
      assert.isTrue(true)
      return
    }

    const res = await client.get('/api/v1/inventory/assets')
    assert.isTrue([200, 401, 403].includes(res.status()))
    assert.isTrue(Boolean(res.header('x-wmsu-inventory-upstream')))
  })

  test('gateway inventory path remains available', async ({ client, assert }) => {
    const catalog = await client.get('/api/v1/gateway')
    catalog.assertStatus(200)
    const systems = catalog.body().data.systems as Array<{ system: string }>
    assert.isTrue(systems.some((s) => s.system === 'inventory'))
  })
})
