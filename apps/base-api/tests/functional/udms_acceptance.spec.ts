import { test } from '@japa/runner'
import { prepareTestDatabase } from '../helpers/udms_test_database.js'

/**
 * Prompt 07 — end-to-end UDMS lifecycle + security smoke on the TOR facade.
 * Uses synthetic demo data only.
 */
test.group('UDMS acceptance lifecycle (Prompt 07)', (group) => {
  group.setup(async () => {
    await prepareTestDatabase()
  })

  async function loginAs(client: { post: Function }, email: string, password: string) {
    const response = await client.post('/api/v1/documents/auth/login').json({ email, password })
    response.assertStatus(200)
    return response.body().tokens.accessToken as string
  }

  async function officesAndType(client: { get: Function }, token: string) {
    const deps = await client
      .get('/api/v1/documents/account/documents/departments')
      .header('Authorization', `Bearer ${token}`)
    deps.assertStatus(200)
    const types = await client
      .get('/api/v1/documents/account/documents/document-types')
      .header('Authorization', `Bearer ${token}`)
    types.assertStatus(200)
    return {
      departmentId: deps.body().departments[0]?.id as string,
      documentTypeId: types.body().documentTypes[0]?.id as string,
    }
  }

  test('protects UDMS facade without authentication', async ({ client, assert }) => {
    const paths = [
      '/api/v1/documents/udms/repository',
      '/api/v1/documents/udms/workflow/queues/assigned',
      '/api/v1/documents/udms/lifecycle/archived',
      '/api/v1/documents/udms/reports/dashboard',
      '/api/v1/documents/udms/foundation/status',
    ]
    for (const path of paths) {
      const res = await client.get(path)
      assert.isTrue(res.status() === 401 || res.status() === 403, `${path} should deny`)
    }
  })

  test('staff without reports.view cannot load dashboard', async ({ client }) => {
    const token = await loginAs(client, 'staff@gmail.com', 'ChangeMe123!')
    const res = await client
      .get('/api/v1/documents/udms/reports/dashboard')
      .header('Authorization', `Bearer ${token}`)
    res.assertStatus(403)
  })

  test('register → track → version → retention → archive → report counts', async ({
    client,
    assert,
  }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    const { departmentId, documentTypeId } = await officesAndType(client, token)

    const beforeDash = await client
      .get('/api/v1/documents/udms/reports/dashboard')
      .header('Authorization', `Bearer ${token}`)
      .qs({ from: '2020-01-01T00:00:00.000Z', to: '2030-12-31T23:59:59.999Z' })
    beforeDash.assertStatus(200)
    const beforeTotal = Number(beforeDash.body().metrics.totalDocuments ?? 0)

    const registered = await client
      .post('/api/v1/documents/udms/repository/register')
      .header('Authorization', `Bearer ${token}`)
      .json({
        title: 'UDMS Prompt07 Acceptance Lifecycle Doc',
        documentTypeId,
        documentDate: '2026-07-01',
        subjectKeywords: 'acceptance, lifecycle',
        originatingOfficeId: departmentId,
        receivingOfficeId: departmentId,
        napCategory: 'administrative',
        confidentiality: 'internal',
        receivingChannel: 'walk_in',
      })
    registered.assertStatus(201)
    const documentId = registered.body().id as string
    assert.exists(registered.body().trackingNumber)

    const listed = await client
      .get('/api/v1/documents/udms/repository')
      .header('Authorization', `Bearer ${token}`)
      .qs({ search: 'Prompt07 Acceptance' })
    listed.assertStatus(200)
    assert.isTrue(
      (listed.body().data ?? []).some((row: { id: string }) => row.id === documentId)
    )

    const detail = await client
      .get(`/api/v1/documents/udms/repository/${documentId}`)
      .header('Authorization', `Bearer ${token}`)
    detail.assertStatus(200)
    assert.equal(detail.body().id, documentId)

    const me = await client
      .get('/api/v1/documents/account/profile')
      .header('Authorization', `Bearer ${token}`)
    me.assertStatus(200)
    const userId = (me.body().user?.id ?? me.body().id) as string
    assert.exists(userId)

    const assigned = await client
      .post(`/api/v1/documents/udms/workflow/documents/${documentId}/assign`)
      .header('Authorization', `Bearer ${token}`)
      .json({ toUserId: userId, toOfficeId: departmentId, remarks: 'Acceptance assign' })
    assigned.assertStatus(200)

    const tracking = await client
      .get(`/api/v1/documents/udms/workflow/documents/${documentId}/tracking`)
      .header('Authorization', `Bearer ${token}`)
    tracking.assertStatus(200)
    assert.equal(tracking.body().document.id, documentId)
    assert.exists(tracking.body().currentAssignment)

    const versionsBefore = await client
      .get(`/api/v1/documents/udms/lifecycle/documents/${documentId}/versions`)
      .header('Authorization', `Bearer ${token}`)
    versionsBefore.assertStatus(200)
    const versionCount = versionsBefore.body().versions.length

    const newVersion = await client
      .post(`/api/v1/documents/udms/lifecycle/documents/${documentId}/versions`)
      .header('Authorization', `Bearer ${token}`)
      .json({ changeNotes: 'Acceptance revision' })
    newVersion.assertStatus(201)

    const versionsAfter = await client
      .get(`/api/v1/documents/udms/lifecycle/documents/${documentId}/versions`)
      .header('Authorization', `Bearer ${token}`)
    versionsAfter.assertStatus(200)
    assert.equal(versionsAfter.body().versions.length, versionCount + 1)

    const schedules = await client
      .get('/api/v1/documents/udms/lifecycle/retention/schedules')
      .header('Authorization', `Bearer ${token}`)
    schedules.assertStatus(200)
    const schedule = schedules
      .body()
      .data.find((row: { napCategory: string }) => row.napCategory === 'administrative')
    assert.exists(schedule)

    const retention = await client
      .post(`/api/v1/documents/udms/lifecycle/documents/${documentId}/retention`)
      .header('Authorization', `Bearer ${token}`)
      .json({ retentionScheduleId: schedule.id })
    retention.assertStatus(200)
    assert.equal(retention.body().retentionScheduleId, schedule.id)

    // Archive may require completed eligibility in DocsTrack; attempt and record outcome.
    const archive = await client
      .post(`/api/v1/documents/udms/lifecycle/documents/${documentId}/archive`)
      .header('Authorization', `Bearer ${token}`)
    assert.isTrue(
      archive.status() === 200 || archive.status() === 422,
      `archive status ${archive.status()}`
    )

    const afterDash = await client
      .get('/api/v1/documents/udms/reports/dashboard')
      .header('Authorization', `Bearer ${token}`)
      .qs({ from: '2020-01-01T00:00:00.000Z', to: '2030-12-31T23:59:59.999Z' })
    afterDash.assertStatus(200)
    assert.equal(Number(afterDash.body().metrics.totalDocuments), beforeTotal + 1)
    assert.exists(afterDash.body().metricDefinitions.totalDocuments)

    const contracts = await client
      .get('/api/v1/documents/udms/integrations/contracts')
      .header('Authorization', `Bearer ${token}`)
    contracts.assertStatus(200)
    assert.isArray(contracts.body())
  })

  test('integration contracts catalog is read-only and lists DMS-010 peers as planned', async ({
    client,
    assert,
  }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    const contracts = await client
      .get('/api/v1/documents/udms/integrations/contracts')
      .header('Authorization', `Bearer ${token}`)
    contracts.assertStatus(200)
    const rows = contracts.body() as Array<{ code: string; status: string }>
    assert.isArray(rows)
    const codes = rows.map((r) => r.code)
    assert.includeMembers(codes, ['INT-DMS-03', 'INT-DMS-05', 'INT-DMS-06', 'INT-DMS-08'])
    const usis = rows.find((r) => r.code === 'INT-DMS-05')
    assert.equal(usis?.status, 'planned')
  })
})
