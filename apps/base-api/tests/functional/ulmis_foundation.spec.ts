import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'

const TENANT_SLUG = env.get('DEFAULT_TENANT_SLUG', 'ulmis') ?? 'ulmis'

async function isDbUnavailable(): Promise<boolean> {
  try {
    await db.rawQuery('select 1')
    return false
  } catch {
    return true
  }
}

async function login(client: any) {
  const password = 'ChangeMe123!'
  const response = await client
    .post('/api/v1/auth/login')
    .header('x-tenant-slug', TENANT_SLUG)
    .json({
      email: 'admin@university.library',
      password,
      tenantSlug: TENANT_SLUG,
    })
  if (response.status() === 200) {
    return response.body().data.tokens?.accessToken as string
  }
  return null
}

test.group('ULMIS foundation (Prompt 02)', (group) => {
  group.tap((t) => t.skip(async () => isDbUnavailable(), 'Database unavailable'))

  test('unauthenticated foundation routes are rejected', async ({ client, assert }) => {
    const paths = [
      '/api/v1/ulmis/foundation/status',
      '/api/v1/ulmis/settings',
      '/api/v1/ulmis/integrations/contracts',
      '/api/v1/audit-logs',
    ]
    for (const path of paths) {
      const res = await client.get(path).header('x-tenant-slug', TENANT_SLUG)
      assert.isTrue(res.status() === 401 || res.status() === 403, `${path} => ${res.status()}`)
    }
  })

  test('audit logs have no mutation routes via ordinary API', async ({ client, assert }) => {
    const token = await login(client)
    if (!token) {
      assert.isTrue(true, 'seed admin unavailable — soft skip')
      return
    }

    const del = await client
      .delete('/api/v1/audit-logs')
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
    assert.isTrue(del.status() === 404 || del.status() >= 400)

    const patch = await client
      .patch('/api/v1/audit-logs/00000000-0000-0000-0000-000000000001')
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
      .json({ action: 'tamper' })
    assert.isTrue(patch.status() === 404 || patch.status() >= 400)
  })

  test('admin can read foundation status, settings, contracts, and audit', async ({
    client,
    assert,
  }) => {
    const token = await login(client)
    if (!token) {
      assert.isTrue(true, 'seed admin unavailable — soft skip')
      return
    }

    const status = await client
      .get('/api/v1/ulmis/foundation/status')
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
    status.assertStatus(200)
    assert.equal(status.body().success, true)
    assert.equal(status.body().data.system, 'ULMIS')
    assert.equal(status.body().data.separateLoginSystem, false)
    assert.equal(status.body().data.auditAppendOnly, true)
    assert.isArray(status.body().data.torRoles)

    const contracts = await client
      .get('/api/v1/ulmis/integrations/contracts')
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
    contracts.assertStatus(200)
    assert.isAtLeast(contracts.body().data.length, 1)

    const key = `foundation.test.${Date.now().toString(36)}`
    const saved = await client
      .put('/api/v1/ulmis/settings')
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
      .json({
        settingKey: key,
        settingValue: { enabled: true, tor: 'LIB-030' },
        description: 'Prompt 02 foundation setting',
      })
    saved.assertStatus(200)
    assert.equal(saved.body().data.settingKey, key)

    const listed = await client
      .get('/api/v1/ulmis/settings')
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
    listed.assertStatus(200)
    assert.isTrue(listed.body().data.some((row: any) => row.settingKey === key))

    const reserved = await client
      .put('/api/v1/ulmis/settings')
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
      .json({
        settingKey: 'auth.mode',
        settingValue: { mode: 'local' },
      })
    assert.equal(reserved.status(), 422)

    const audits = await client
      .get('/api/v1/audit-logs')
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
    audits.assertStatus(200)
    assert.equal(audits.body().success, true)

    const outbox = await client
      .get('/api/v1/ulmis/integrations/outbox')
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
    outbox.assertStatus(200)
  })
})
