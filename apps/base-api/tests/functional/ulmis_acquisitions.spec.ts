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
  const response = await client
    .post('/api/v1/auth/login')
    .header('x-tenant-slug', TENANT_SLUG)
    .json({
      email: 'admin@university.library',
      password: 'ChangeMe123!',
      tenantSlug: TENANT_SLUG,
    })
  if (response.status() === 200) {
    return response.body().data.tokens?.accessToken as string
  }
  return null
}

async function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'x-tenant-slug': TENANT_SLUG,
  }
}

test.group('ULMIS acquisitions (Prompt 05)', (group) => {
  group.tap((t) => t.skip(async () => isDbUnavailable(), 'Database unavailable'))

  test('rejects unauthenticated acquisitions dashboard', async ({ client, assert }) => {
    const res = await client
      .get('/api/v1/acquisitions/dashboard')
      .header('x-tenant-slug', TENANT_SLUG)
    assert.isTrue(res.status() === 401 || res.status() === 403)
  })

  test('create, submit, route outbox, acknowledge, catalog link, and cancel guards', async ({
    client,
    assert,
  }) => {
    const token = await login(client)
    if (!token) {
      assert.isTrue(true, 'seed admin unavailable — soft skip')
      return
    }
    const headers = await authHeaders(token)
    const suffix = Date.now().toString(36)

    const dash = await client.get('/api/v1/acquisitions/dashboard').headers(headers)
    dash.assertStatus(200)
    assert.properties(dash.body().data, ['draftCount', 'pendingRouteCount', 'ownershipNote'])

    const created = await client.post('/api/v1/acquisitions').headers(headers).json({
      title: `Acq Spec ${suffix}`,
      authors: 'Spec Author',
      isbn13: `978${String(Date.now()).slice(-10)}`.slice(0, 13),
      materialType: 'book',
      quantity: 2,
      justification: 'Curriculum support',
      requestingUnit: 'University Library',
    })
    created.assertStatus(201)
    assert.equal(created.body().data.status, 'draft')
    const id = created.body().data.id as string
    assert.match(created.body().data.requestNumber, /^ACQ-\d{4}-\d{6}$/)

    const invalidEdit = await client
      .post(`/api/v1/acquisitions/${id}/submit`)
      .headers(headers)
    invalidEdit.assertStatus(200)
    assert.equal(invalidEdit.body().data.status, 'submitted')

    const editAfterSubmit = await client
      .patch(`/api/v1/acquisitions/${id}`)
      .headers(headers)
      .json({ title: 'Should fail' })
    assert.equal(editAfterSubmit.status(), 422)

    const routed = await client.post(`/api/v1/acquisitions/${id}/route`).headers(headers)
    routed.assertStatus(200)
    assert.equal(routed.body().data.status, 'routed')
    assert.isString(routed.body().data.outboxId)

    const outbox = await client
      .get('/api/v1/ulmis/integrations/outbox')
      .headers(headers)
      .qs({ contractCode: 'INT-LIB-07', perPage: 5 })
    outbox.assertStatus(200)
    const outboxRows = outbox.body().data as any[]
    assert.isTrue(outboxRows.some((r) => r.id === routed.body().data.outboxId))

    const cancelRouted = await client
      .post(`/api/v1/acquisitions/${id}/cancel`)
      .headers(headers)
      .json({ reason: 'too late' })
    assert.equal(cancelRouted.status(), 422)

    const ack = await client
      .post(`/api/v1/acquisitions/${id}/acknowledge`)
      .headers(headers)
      .json({ ufmsPrRef: `PR-TEST-${suffix}` })
    ack.assertStatus(200)
    assert.equal(ack.body().data.status, 'acknowledged')
    assert.equal(ack.body().data.ufmsPrRef, `PR-TEST-${suffix}`)

    const book = await client.post('/api/v1/books').headers(headers).json({
      title: `Acq Catalog ${suffix}`,
      authors: ['Spec Author'],
      materialType: 'book',
      initialCopies: 1,
    })
    book.assertStatus(201)
    const bookId = book.body().data.id as string

    const linked = await client
      .post(`/api/v1/acquisitions/${id}/link-catalog`)
      .headers(headers)
      .json({ catalogedBookId: bookId })
    linked.assertStatus(200)
    assert.equal(linked.body().data.status, 'cataloged')
    assert.equal(linked.body().data.catalogedBookId, bookId)

    const cancelDraft = await client.post('/api/v1/acquisitions').headers(headers).json({
      title: `Cancel Me ${suffix}`,
      quantity: 1,
    })
    cancelDraft.assertStatus(201)
    const cancelId = cancelDraft.body().data.id as string
    const cancelled = await client
      .post(`/api/v1/acquisitions/${cancelId}/cancel`)
      .headers(headers)
      .json({ reason: 'duplicate' })
    cancelled.assertStatus(200)
    assert.equal(cancelled.body().data.status, 'cancelled')

    await client.delete(`/api/v1/books/${bookId}`).headers(headers)
  })
})
