import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { prepareTestDatabase } from '../helpers/udms_test_database.js'

test.group('UDMS foundation (Prompt 02)', (group) => {
  group.setup(async () => {
    await prepareTestDatabase()
  })

  async function loginAs(client: { post: Function }, email: string, password: string) {
    const response = await client.post('/api/v1/documents/auth/login').json({ email, password })
    return response.body().tokens?.accessToken as string | undefined
  }

  test('unauthenticated UDMS foundation routes are rejected', async ({ client, assert }) => {
    const paths = [
      '/api/v1/documents/udms/foundation/status',
      '/api/v1/documents/udms/settings',
      '/api/v1/documents/udms/integrations/contracts',
      '/api/v1/documents/udms/integrations/outbox',
    ]
    for (const path of paths) {
      const res = await client.get(path)
      assert.isTrue(res.status() === 401 || res.status() === 403, `${path} => ${res.status()}`)
    }
  })

  test('foundation tables exist with constraints', async ({ assert }) => {
    const settings = await db.rawQuery(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'udms_system_settings'
       ORDER BY ordinal_position`
    )
    const settingCols = (settings.rows as { column_name: string }[]).map((r) => r.column_name)
    assert.includeMembers(settingCols, [
      'id',
      'tenant_id',
      'setting_key',
      'setting_value',
      'created_at',
      'updated_at',
    ])

    const outbox = await db.rawQuery(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'udms_integration_outbox'
       ORDER BY ordinal_position`
    )
    const outboxCols = (outbox.rows as { column_name: string }[]).map((r) => r.column_name)
    assert.includeMembers(outboxCols, [
      'id',
      'tenant_id',
      'contract_code',
      'idempotency_key',
      'status',
      'payload',
    ])
  })

  test('owner can read status, contracts, settings, outbox; reserved keys rejected', async ({
    client,
    assert,
  }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    assert.exists(token)

    const status = await client
      .get('/api/v1/documents/udms/foundation/status')
      .header('Authorization', `Bearer ${token}`)
    status.assertStatus(200)
    assert.equal(status.body().system, 'UDMS')
    assert.equal(status.body().prompt, '02')
    assert.equal(status.body().separateLoginSystem, false)
    assert.equal(status.body().separateFileStorage, false)
    assert.equal(status.body().auditAppendOnly, true)
    assert.isArray(status.body().torRoles)
    assert.isAtLeast(status.body().torRoles.length, 6)

    const contracts = await client
      .get('/api/v1/documents/udms/integrations/contracts')
      .header('Authorization', `Bearer ${token}`)
    contracts.assertStatus(200)
    assert.isAtLeast(contracts.body().length, 1)
    assert.isTrue(contracts.body().some((c: { code: string }) => c.code === 'INT-DMS-01'))

    const key = `foundation.test.${Date.now().toString(36)}`
    const saved = await client
      .put('/api/v1/documents/udms/settings')
      .header('Authorization', `Bearer ${token}`)
      .json({
        settingKey: key,
        settingValue: { enabled: true, tor: 'DMS-011' },
        description: 'Prompt 02 foundation setting',
      })
    saved.assertStatus(200)
    assert.equal(saved.body().settingKey, key)

    const listed = await client
      .get('/api/v1/documents/udms/settings')
      .header('Authorization', `Bearer ${token}`)
    listed.assertStatus(200)
    assert.isTrue(listed.body().some((row: { settingKey: string }) => row.settingKey === key))

    const reserved = await client
      .put('/api/v1/documents/udms/settings')
      .header('Authorization', `Bearer ${token}`)
      .json({
        settingKey: 'auth.mode',
        settingValue: { mode: 'local' },
      })
    assert.equal(reserved.status(), 422)

    const outbox = await client
      .get('/api/v1/documents/udms/integrations/outbox')
      .header('Authorization', `Bearer ${token}`)
    outbox.assertStatus(200)
    assert.isArray(outbox.body().data)
    assert.exists(outbox.body().meta)

    const audits = await client
      .get('/api/v1/documents/account/audit-logs')
      .header('Authorization', `Bearer ${token}`)
    audits.assertStatus(200)
  })

  test('viewer without settings.manage cannot access UDMS foundation', async ({
    client,
    assert,
  }) => {
    const token = await loginAs(client, 'viewer@gmail.com', 'ChangeMe123!')
    assert.exists(token)

    const status = await client
      .get('/api/v1/documents/udms/foundation/status')
      .header('Authorization', `Bearer ${token}`)
    assert.equal(status.status(), 403)

    const contracts = await client
      .get('/api/v1/documents/udms/integrations/contracts')
      .header('Authorization', `Bearer ${token}`)
    assert.equal(contracts.status(), 403)
  })

  test('TOR DMS-025 roles are seeded for demo tenant', async ({ assert }) => {
    const rows = await db
      .from('roles')
      .join('tenants', 'tenants.id', 'roles.tenant_id')
      .where('tenants.slug', 'demo-gov')
      .whereIn('roles.slug', [
        'tor_administrator',
        'tor_records_manager',
        'tor_digitization_officer',
        'tor_department_reviewer',
        'tor_standard_user',
        'tor_auditor',
      ])
      .select('roles.slug')

    const slugs = rows.map((r: { slug: string }) => r.slug)
    assert.includeMembers(slugs, [
      'tor_administrator',
      'tor_records_manager',
      'tor_digitization_officer',
      'tor_department_reviewer',
      'tor_standard_user',
      'tor_auditor',
    ])
  })
})
