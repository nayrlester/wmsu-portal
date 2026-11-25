import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { prepareTestDatabase } from '../helpers/udms_test_database.js'
import Document from '#modules/documents/models/document'
import { DocumentStatus } from '#modules/documents/domain/enums/index'

test.group('UDMS lifecycle / versions / retention (Prompt 05)', (group) => {
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

  async function registerDocument(client: { post: Function }, token: string, title: string) {
    const { departmentId, documentTypeId } = await officesAndType(client, token)
    const registered = await client
      .post('/api/v1/documents/udms/repository/register')
      .header('Authorization', `Bearer ${token}`)
      .json({
        title,
        documentTypeId,
        documentDate: '2026-05-01',
        subjectKeywords: 'lifecycle, retention',
        originatingOfficeId: departmentId,
        receivingOfficeId: departmentId,
        napCategory: 'administrative',
        confidentiality: 'internal',
        receivingChannel: 'walk_in',
      })
    registered.assertStatus(201)
    return registered.body().id as string
  }

  test('rejects unauthenticated lifecycle access', async ({ client, assert }) => {
    const res = await client.get('/api/v1/documents/udms/lifecycle/archived')
    assert.isTrue(res.status() === 401 || res.status() === 403)
  })

  test('lists versions and creates a new version without overwriting history', async ({
    client,
    assert,
  }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    const documentId = await registerDocument(client, token, 'UDMS Version History Sample')

    const initial = await client
      .get(`/api/v1/documents/udms/lifecycle/documents/${documentId}/versions`)
      .header('Authorization', `Bearer ${token}`)
    initial.assertStatus(200)
    assert.isAtLeast(initial.body().versions.length, 1)
    const firstId = initial.body().versions[0].id

    const created = await client
      .post(`/api/v1/documents/udms/lifecycle/documents/${documentId}/versions`)
      .header('Authorization', `Bearer ${token}`)
      .json({ changeNotes: 'Revised for records review' })
    created.assertStatus(201)
    assert.notEqual(created.body().id, firstId)

    const after = await client
      .get(`/api/v1/documents/udms/lifecycle/documents/${documentId}/versions`)
      .header('Authorization', `Bearer ${token}`)
    after.assertStatus(200)
    assert.isAtLeast(after.body().versions.length, 2)
    assert.exists(after.body().versions.find((v: { id: string }) => v.id === firstId))
    assert.equal(after.body().currentVersion.id, created.body().id)
  })

  test('applies configured retention schedule and exposes summary', async ({ client, assert }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    const documentId = await registerDocument(client, token, 'UDMS Retention Apply Sample')

    const schedules = await client
      .get('/api/v1/documents/udms/lifecycle/retention/schedules')
      .header('Authorization', `Bearer ${token}`)
    schedules.assertStatus(200)
    assert.isAtLeast(schedules.body().data.length, 1)
    const matching = schedules
      .body()
      .data.find((row: { napCategory: string }) => row.napCategory === 'administrative')
    assert.exists(matching)
    const scheduleId = matching.id as string

    const applied = await client
      .post(`/api/v1/documents/udms/lifecycle/documents/${documentId}/retention`)
      .header('Authorization', `Bearer ${token}`)
      .json({ retentionScheduleId: scheduleId })
    applied.assertStatus(200)
    assert.equal(applied.body().retentionScheduleId, scheduleId)

    const summary = await client
      .get(`/api/v1/documents/udms/lifecycle/documents/${documentId}/summary`)
      .header('Authorization', `Bearer ${token}`)
    summary.assertStatus(200)
    assert.equal(summary.body().retention.scheduleId, scheduleId)
    assert.exists(summary.body().policyNotes.retentionPeriods)
  })

  test('archives eligible document, lists archived, and restores', async ({ client, assert }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    const documentId = await registerDocument(client, token, 'UDMS Archive Restore Sample')

    const draftArchive = await client
      .post(`/api/v1/documents/udms/lifecycle/documents/${documentId}/archive`)
      .header('Authorization', `Bearer ${token}`)
    assert.equal(draftArchive.status(), 422)

    await Document.query().where('id', documentId).update({
      status: DocumentStatus.COMPLETED,
      completed_at: DateTime.now().toSQL(),
    })

    const archived = await client
      .post(`/api/v1/documents/udms/lifecycle/documents/${documentId}/archive`)
      .header('Authorization', `Bearer ${token}`)
    archived.assertStatus(200)
    assert.equal(archived.body().status, DocumentStatus.ARCHIVED)

    const listed = await client
      .get('/api/v1/documents/udms/lifecycle/archived')
      .header('Authorization', `Bearer ${token}`)
    listed.assertStatus(200)
    assert.isTrue(listed.body().data.some((row: { id: string }) => row.id === documentId))

    const restored = await client
      .post(`/api/v1/documents/udms/lifecycle/documents/${documentId}/restore`)
      .header('Authorization', `Bearer ${token}`)
      .json({ remarks: 'Restore for continued reference' })
    restored.assertStatus(200)
    assert.notEqual(restored.body().status, DocumentStatus.ARCHIVED)
    assert.notEqual(restored.body().lifecycleStatus, 'archived')
  })

  test('disposal create requires archives permission path and blocks legal-hold docs', async ({
    client,
    assert,
  }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    const documentId = await registerDocument(client, token, 'UDMS Disposal Guard Sample')

    await client
      .post(`/api/v1/documents/udms/lifecycle/documents/${documentId}/legal-hold`)
      .header('Authorization', `Bearer ${token}`)
      .json({ hold: true, reason: 'Pending investigation hold' })

    const disposal = await client
      .post('/api/v1/documents/udms/lifecycle/disposals')
      .header('Authorization', `Bearer ${token}`)
      .json({
        title: 'Should fail legal hold',
        justification: 'Attempt dispose while held',
        documentIds: [documentId],
      })
    assert.equal(disposal.status(), 422)
  })

  test('registration and workflow tracking remain available', async ({ client, assert }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    const documentId = await registerDocument(client, token, 'UDMS Lifecycle Regression Sample')
    const tracking = await client
      .get(`/api/v1/documents/udms/workflow/documents/${documentId}/tracking`)
      .header('Authorization', `Bearer ${token}`)
    tracking.assertStatus(200)
    assert.equal(tracking.body().document.id, documentId)
  })
})
