import { test } from '@japa/runner'
import { prepareTestDatabase } from '../helpers/udms_test_database.js'

test.group('UDMS reports / dashboard (Prompt 06)', (group) => {
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

  test('rejects unauthenticated and staff without reports.view', async ({ client, assert }) => {
    const unauth = await client.get('/api/v1/documents/udms/reports/dashboard')
    assert.isTrue(unauth.status() === 401 || unauth.status() === 403)

    const staffToken = await loginAs(client, 'staff@gmail.com', 'ChangeMe123!')
    const denied = await client
      .get('/api/v1/documents/udms/reports/dashboard')
      .header('Authorization', `Bearer ${staffToken}`)
    assert.isTrue(denied.status() === 403 || denied.status() === 401)
  })

  test('dashboard aggregates real registration counts for the period', async ({
    client,
    assert,
  }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    const { departmentId, documentTypeId } = await officesAndType(client, token)

    const before = await client
      .get('/api/v1/documents/udms/reports/dashboard')
      .header('Authorization', `Bearer ${token}`)
      .qs({
        from: '2020-01-01T00:00:00.000Z',
        to: '2030-12-31T23:59:59.999Z',
      })
    before.assertStatus(200)
    const beforeTotal = Number(before.body().metrics.totalDocuments ?? 0)
    const beforePeriod = Number(before.body().metrics.registeredInPeriod ?? 0)

    const registered = await client
      .post('/api/v1/documents/udms/repository/register')
      .header('Authorization', `Bearer ${token}`)
      .json({
        title: 'UDMS Reports Aggregate Sample',
        documentTypeId,
        documentDate: '2026-06-01',
        subjectKeywords: 'reports, dashboard',
        originatingOfficeId: departmentId,
        receivingOfficeId: departmentId,
        napCategory: 'administrative',
        confidentiality: 'internal',
        receivingChannel: 'walk_in',
      })
    registered.assertStatus(201)

    const after = await client
      .get('/api/v1/documents/udms/reports/dashboard')
      .header('Authorization', `Bearer ${token}`)
      .qs({
        from: '2020-01-01T00:00:00.000Z',
        to: '2030-12-31T23:59:59.999Z',
      })
    after.assertStatus(200)
    assert.equal(Number(after.body().metrics.totalDocuments), beforeTotal + 1)
    assert.equal(Number(after.body().metrics.registeredInPeriod), beforePeriod + 1)
    assert.exists(after.body().distributions.byStatus)
    assert.exists(after.body().metricDefinitions.totalDocuments)
    assert.equal(typeof after.body().metrics.averageElapsedHoursSubmitToComplete === 'number' ||
      after.body().metrics.averageElapsedHoursSubmitToComplete === null, true)
  })

  test('registration report filters by period and exports csv', async ({ client, assert }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')

    const report = await client
      .get('/api/v1/documents/udms/reports/registration')
      .header('Authorization', `Bearer ${token}`)
      .qs({
        from: '2020-01-01T00:00:00.000Z',
        to: '2030-12-31T23:59:59.999Z',
        page: 1,
        limit: 10,
      })
    report.assertStatus(200)
    assert.isArray(report.body().data)
    assert.exists(report.body().aggregates)

    const csv = await client
      .get('/api/v1/documents/udms/reports/dashboard')
      .header('Authorization', `Bearer ${token}`)
      .qs({ format: 'csv' })
    csv.assertStatus(200)
    assert.include(String(csv.text()), 'metric,value')
  })

  test('workflow and archival reports return structured metrics', async ({ client, assert }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')

    const workflow = await client
      .get('/api/v1/documents/udms/reports/workflow')
      .header('Authorization', `Bearer ${token}`)
    workflow.assertStatus(200)
    assert.exists(workflow.body().metrics.awaitingAction)
    assert.exists(workflow.body().policyNotes.assignmentIsNotReceipt)

    const archival = await client
      .get('/api/v1/documents/udms/reports/archival')
      .header('Authorization', `Bearer ${token}`)
    archival.assertStatus(200)
    assert.exists(archival.body().metrics.missingRetentionSchedule)
    assert.exists(archival.body().metricDefinitions.missingRetentionSchedule)

    const printable = await client
      .get('/api/v1/documents/udms/reports/printable')
      .header('Authorization', `Bearer ${token}`)
    printable.assertStatus(200)
    assert.include(String(printable.text()), 'UDMS Management Dashboard')
  })

  test('rejects invalid date range', async ({ client }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    const bad = await client
      .get('/api/v1/documents/udms/reports/dashboard')
      .header('Authorization', `Bearer ${token}`)
      .qs({
        from: '2030-01-01T00:00:00.000Z',
        to: '2020-01-01T00:00:00.000Z',
      })
    bad.assertStatus(422)
  })
})
