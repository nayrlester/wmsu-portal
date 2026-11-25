import { test } from '@japa/runner'
import { prepareTestDatabase } from '../helpers/udms_test_database.js'
import User from '#modules/documents/models/user'
import { DocumentStatus } from '#modules/documents/domain/enums/index'

test.group('UDMS workflow / tracking (Prompt 04)', (group) => {
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

  async function registerDocument(client: { post: Function }, token: string) {
    const { departmentId, documentTypeId } = await officesAndType(client, token)
    const registered = await client
      .post('/api/v1/documents/udms/repository/register')
      .header('Authorization', `Bearer ${token}`)
      .json({
        title: 'UDMS Workflow Tracking Sample',
        documentTypeId,
        documentDate: '2026-04-01',
        subjectKeywords: 'routing, workflow',
        originatingOfficeId: departmentId,
        receivingOfficeId: departmentId,
        napCategory: 'administrative',
        confidentiality: 'internal',
        receivingChannel: 'walk_in',
      })
    registered.assertStatus(201)
    return { documentId: registered.body().id as string, departmentId }
  }

  test('rejects unauthenticated workflow queues', async ({ client, assert }) => {
    const res = await client.get('/api/v1/documents/udms/workflow/queues/assigned')
    assert.isTrue(res.status() === 401 || res.status() === 403)
  })

  test('office queue requires officeId', async ({ client, assert }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    const res = await client
      .get('/api/v1/documents/udms/workflow/queues/office')
      .header('Authorization', `Bearer ${token}`)
    assert.equal(res.status(), 422)
  })

  test('assigns, tracks history, and lists assigned queue', async ({ client, assert }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    const { documentId } = await registerDocument(client, token)
    const assignee = await User.query().where('email', 'owner@gmail.com').firstOrFail()

    const assign = await client
      .post(`/api/v1/documents/udms/workflow/documents/${documentId}/assign`)
      .header('Authorization', `Bearer ${token}`)
      .json({ toUserId: assignee.id, remarks: 'Assign for intake review' })
    assign.assertStatus(200)
    assert.equal(assign.body().assignedToId, assignee.id)

    const tracking = await client
      .get(`/api/v1/documents/udms/workflow/documents/${documentId}/tracking`)
      .header('Authorization', `Bearer ${token}`)
    tracking.assertStatus(200)
    assert.equal(tracking.body().currentAssignment.assignedToId, assignee.id)
    assert.equal(tracking.body().document.id, documentId)

    const assignedQueue = await client
      .get('/api/v1/documents/udms/workflow/queues/assigned')
      .header('Authorization', `Bearer ${token}`)
    assignedQueue.assertStatus(200)
    assert.isTrue(
      assignedQueue.body().data.some((row: { id: string }) => row.id === documentId)
    )
  })

  test('routes submitted document and rejects draft routing', async ({ client, assert }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    const { documentId, departmentId } = await registerDocument(client, token)
    const assignee = await User.query().where('email', 'owner@gmail.com').firstOrFail()

    const draftRoute = await client
      .post(`/api/v1/documents/udms/workflow/documents/${documentId}/route`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        toUserId: assignee.id,
        toOfficeId: departmentId,
        remarks: 'Should fail on draft',
      })
    assert.equal(draftRoute.status(), 422)

    const submit = await client
      .post(`/api/v1/documents/account/documents/${documentId}/submit`)
      .header('Authorization', `Bearer ${token}`)
    submit.assertStatus(200)

    const route = await client
      .post(`/api/v1/documents/udms/workflow/documents/${documentId}/route`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        toUserId: assignee.id,
        toOfficeId: departmentId,
        remarks: 'Forward to receiving office',
      })
    route.assertStatus(200)
    assert.equal(route.body().receivingOfficeId, departmentId)

    const tracking = await client
      .get(`/api/v1/documents/udms/workflow/documents/${documentId}/tracking`)
      .header('Authorization', `Bearer ${token}`)
    tracking.assertStatus(200)
    assert.isAtLeast((tracking.body().timeline ?? []).length ?? 0, 1)

    const officeQueue = await client
      .get('/api/v1/documents/udms/workflow/queues/office')
      .header('Authorization', `Bearer ${token}`)
      .qs({ officeId: departmentId })
    officeQueue.assertStatus(200)
    assert.isTrue(officeQueue.body().data.some((row: { id: string }) => row.id === documentId))

    const awaiting = await client
      .get('/api/v1/documents/udms/workflow/queues/awaiting-action')
      .header('Authorization', `Bearer ${token}`)
    awaiting.assertStatus(200)
  })

  test('rejects invalid workflow action payload', async ({ client, assert }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    const { documentId } = await registerDocument(client, token)
    const res = await client
      .post(`/api/v1/documents/udms/workflow/documents/${documentId}/actions`)
      .header('Authorization', `Bearer ${token}`)
      .json({ action: 'invented_status' })
    assert.equal(res.status(), 422)
  })

  test('registration still works after workflow facade', async ({ client, assert }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    const { documentId } = await registerDocument(client, token)
    assert.isString(documentId)

    const detail = await client
      .get(`/api/v1/documents/udms/repository/${documentId}`)
      .header('Authorization', `Bearer ${token}`)
    detail.assertStatus(200)
    assert.equal(detail.body().status, DocumentStatus.DRAFT)
  })
})
