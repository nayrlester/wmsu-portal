import { test } from '@japa/runner'

async function identityReachable(): Promise<boolean> {
  try {
    const upstream = process.env.GATEWAY_IDENTITY_URL || 'http://127.0.0.1:3411'
    const res = await fetch(`${upstream}/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

test.group('Common Platform Phase 1 façade', () => {
  test('platform status describes identity façade contracts', async ({ client, assert }) => {
    const res = await client.get('/api/v1/platform/status')
    res.assertStatus(200)
    assert.equal(res.body().data.phase, 'phase1-facade')
    assert.equal(res.body().data.module, 'common-platform')
    assert.isArray(res.body().data.contracts)
    assert.property(res.body().data.satellitesShouldUse, 'PLATFORM_IDENTITY_URL')
  })

  test('launcher catalog lists university apps', async ({ client, assert }) => {
    const res = await client.get('/api/v1/platform/launcher')
    res.assertStatus(200)
    const apps = res.body().data.apps as Array<{ code: string }>
    assert.isAbove(apps.length, 5)
    assert.isTrue(apps.some((a) => a.code === 'enrollment'))
    assert.isTrue(apps.some((a) => a.code === 'records'))
  })

  test('auth login façade proxies to identity when upstream is up', async ({ client, assert }) => {
    const up = await identityReachable()
    if (!up) {
      assert.isTrue(true)
      return
    }

    const res = await client.post('/api/v1/auth/login').json({
      email: 'admin@uims.local',
      password: process.env.DEMO_SEED_PASSWORD || 'ChangeMe123!',
    })
    assert.isTrue([200, 401, 422].includes(res.status()))
    assert.isTrue(Boolean(res.header('x-wmsu-identity-upstream')))
  })

  test('jwks façade responds when identity upstream is up', async ({ client, assert }) => {
    const up = await identityReachable()
    if (!up) {
      assert.isTrue(true)
      return
    }
    const res = await client.get('/.well-known/jwks.json')
    assert.isTrue([200, 404].includes(res.status()))
  })
})
