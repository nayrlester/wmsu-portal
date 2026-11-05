import { test } from '@japa/runner'

async function enrollmentReachable(): Promise<boolean> {
  try {
    const upstream = process.env.GATEWAY_ENROLLMENT_URL || 'http://127.0.0.1:3340'
    const res = await fetch(`${upstream}/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

test.group('Enrollment Phase 2 façade', () => {
  test('enrollment status describes USiS façade contracts', async ({ client, assert }) => {
    const res = await client.get('/api/v1/enrollment/_status')
    res.assertStatus(200)
    assert.equal(res.body().data.phase, 'phase2-enrollment-facade')
    assert.equal(res.body().data.module, 'enrollment')
    assert.equal(res.body().data.torSystem, 'USiS')
    assert.equal(res.body().data.schemaTarget, 'enrollment')
    assert.equal(res.body().data.entrypoints.facadePrefix, '/api/v1/enrollment')
  })

  test('enrollment health reports upstream availability', async ({ client, assert }) => {
    const res = await client.get('/api/v1/enrollment/_health')
    assert.isTrue([200, 503].includes(res.status()))
    assert.property(res.body().data, 'upstream')
    assert.property(res.body().data, 'ok')
  })

  test('enrollment students façade proxies when upstream is up', async ({ client, assert }) => {
    const up = await enrollmentReachable()
    if (!up) {
      assert.isTrue(true)
      return
    }

    const res = await client.get('/api/v1/enrollment/students')
    assert.isTrue([200, 401, 403].includes(res.status()))
    assert.isTrue(Boolean(res.header('x-wmsu-enrollment-upstream')))
  })

  test('gateway enrollment path remains available', async ({ client, assert }) => {
    const catalog = await client.get('/api/v1/gateway')
    catalog.assertStatus(200)
    const systems = catalog.body().data.systems as Array<{ system: string }>
    assert.isTrue(systems.some((s) => s.system === 'enrollment'))
  })
})
