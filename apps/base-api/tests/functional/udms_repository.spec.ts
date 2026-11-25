import { test } from '@japa/runner'
import { prepareTestDatabase } from '../helpers/udms_test_database.js'

test.group('UDMS repository / registration (Prompt 03)', (group) => {
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

  test('rejects unauthenticated repository access', async ({ client, assert }) => {
    const res = await client.get('/api/v1/documents/udms/repository')
    assert.isTrue(res.status() === 401 || res.status() === 403)
  })

  test('rejects registration missing TOR metadata', async ({ client, assert }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    const res = await client
      .post('/api/v1/documents/udms/repository/register')
      .header('Authorization', `Bearer ${token}`)
      .json({ title: 'Incomplete Registry Entry' })
    assert.equal(res.status(), 422)
  })

  test('registers document with unique tracking number and TOR fields', async ({
    client,
    assert,
  }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    const { departmentId, documentTypeId } = await officesAndType(client, token)

    const folder = await client
      .post('/api/v1/documents/udms/file-plan')
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'Administrative Series', code: 'ADM' })
    folder.assertStatus(201)

    const registered = await client
      .post('/api/v1/documents/udms/repository/register')
      .header('Authorization', `Bearer ${token}`)
      .json({
        title: 'Incoming Memo Registry Test',
        documentTypeId,
        documentDate: '2026-03-15',
        subjectKeywords: 'budget, allocation',
        originatingOfficeId: departmentId,
        receivingOfficeId: departmentId,
        napCategory: 'administrative',
        confidentiality: 'internal',
        receivingChannel: 'walk_in',
        filePlanNodeId: folder.body().id,
      })

    registered.assertStatus(201)
    assert.match(registered.body().trackingNumber, /^DTS-\d{4}-\d{7}$/)
    assert.equal(registered.body().napCategory, 'administrative')
    assert.equal(registered.body().subjectKeywords, 'budget, allocation')
    assert.equal(registered.body().originatingOfficeId, departmentId)
    assert.equal(registered.body().receivingOfficeId, departmentId)
    assert.equal(registered.body().filePlanNodeId, folder.body().id)
    assert.equal(registered.body().receivingChannel, 'walk_in')

    const listed = await client
      .get('/api/v1/documents/udms/repository')
      .header('Authorization', `Bearer ${token}`)
      .qs({ napCategory: 'administrative', search: 'Incoming Memo' })
    listed.assertStatus(200)
    assert.isTrue(
      listed.body().data.some((row: { id: string }) => row.id === registered.body().id)
    )

    const exact = await client
      .get('/api/v1/documents/udms/repository')
      .header('Authorization', `Bearer ${token}`)
      .qs({ trackingNumber: registered.body().trackingNumber })
    exact.assertStatus(200)
    assert.isAtLeast(exact.body().data.length, 1)

    const detail = await client
      .get(`/api/v1/documents/udms/repository/${registered.body().id}`)
      .header('Authorization', `Bearer ${token}`)
    detail.assertStatus(200)
    assert.equal(detail.body().id, registered.body().id)

    const updated = await client
      .put(`/api/v1/documents/udms/repository/${registered.body().id}/metadata`)
      .header('Authorization', `Bearer ${token}`)
      .json({ subjectKeywords: 'budget, allocation, fy2026' })
    updated.assertStatus(200)
    assert.equal(updated.body().subjectKeywords, 'budget, allocation, fy2026')
  })

  test('viewer cannot register documents', async ({ client, assert }) => {
    const token = await loginAs(client, 'viewer@gmail.com', 'ChangeMe123!')
    const res = await client
      .post('/api/v1/documents/udms/repository/register')
      .header('Authorization', `Bearer ${token}`)
      .json({
        title: 'Should Fail',
        documentTypeId: '00000000-0000-0000-0000-000000000001',
        documentDate: '2026-01-01',
        subjectKeywords: 'x',
        originatingOfficeId: '00000000-0000-0000-0000-000000000001',
        receivingOfficeId: '00000000-0000-0000-0000-000000000001',
        napCategory: 'administrative',
      })
    assert.equal(res.status(), 403)
  })

  test('rejects duplicate file-plan path', async ({ client, assert }) => {
    const token = await loginAs(client, 'owner@gmail.com', 'ChangeMe123!')
    const first = await client
      .post('/api/v1/documents/udms/file-plan')
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'Governance', code: 'GOV' })
    first.assertStatus(201)

    const dup = await client
      .post('/api/v1/documents/udms/file-plan')
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'Governance Copy', code: 'GOV' })
    assert.equal(dup.status(), 422)
  })
})
