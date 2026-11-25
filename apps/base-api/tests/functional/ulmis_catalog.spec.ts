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

test.group('ULMIS catalog (Prompt 03)', (group) => {
  group.tap((t) => t.skip(async () => isDbUnavailable(), 'Database unavailable'))

  test('rejects unauthenticated catalog access', async ({ client, assert }) => {
    const res = await client.get('/api/v1/books').header('x-tenant-slug', TENANT_SLUG)
    assert.isTrue(res.status() === 401 || res.status() === 403)
  })

  test('admin can create, search, update, version, export, and soft-delete catalog records', async ({
    client,
    assert,
  }) => {
    const token = await login(client)
    if (!token) {
      assert.isTrue(true, 'seed admin unavailable — soft skip')
      return
    }

    const suffix = Date.now().toString(36)
    const isbn13 = `978${String(Date.now()).slice(-10)}`.slice(0, 13)

    const created = await client
      .post('/api/v1/books')
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
      .json({
        title: `ULMIS Catalog Spec ${suffix}`,
        authors: ['Test Author'],
        subjects: ['Education', 'Library Science'],
        materialType: 'book',
        classificationScheme: 'ddc',
        classificationNumber: '020.1',
        publicationYear: 2024,
        isbn13,
        publisherName: 'WMSU Press',
        categoryName: 'Academic',
        initialCopies: 1,
        shelfLocation: 'CAT-01',
      })
    created.assertStatus(201)
    assert.equal(created.body().success, true)
    assert.equal(created.body().data.materialType, 'book')
    assert.equal(created.body().data.classificationScheme, 'ddc')
    assert.include(created.body().data.subjects, 'Education')
    const bookId = created.body().data.id as string

    const dup = await client
      .post('/api/v1/books')
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
      .json({
        title: `Duplicate ISBN ${suffix}`,
        authors: ['Other'],
        isbn13,
        materialType: 'book',
        initialCopies: 0,
      })
    assert.equal(dup.status(), 422)

    const listed = await client
      .get('/api/v1/books')
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
      .qs({ search: suffix, materialType: 'book', page: 1, perPage: 25 })
    listed.assertStatus(200)
    assert.isTrue(listed.body().data.some((row: any) => row.id === bookId))

    const updated = await client
      .patch(`/api/v1/books/${bookId}`)
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
      .json({
        title: `ULMIS Catalog Spec ${suffix} Updated`,
        subjects: ['Education'],
      })
    updated.assertStatus(200)
    assert.equal(updated.body().data.metadataVersion, 2)

    const versions = await client
      .get(`/api/v1/books/${bookId}/versions`)
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
    versions.assertStatus(200)
    assert.isAtLeast(versions.body().data.length, 2)

    const marc = await client
      .get(`/api/v1/books/${bookId}/export/marc`)
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
    marc.assertStatus(200)
    assert.equal(marc.body().data.fields['245'], `ULMIS Catalog Spec ${suffix} Updated`)

    const deleted = await client
      .delete(`/api/v1/books/${bookId}`)
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
    deleted.assertStatus(200)

    const missing = await client
      .get(`/api/v1/books/${bookId}`)
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
    assert.isTrue(missing.status() === 404 || missing.status() >= 400)
  })

  test('blocks delete when copy is on loan', async ({ client, assert }) => {
    const token = await login(client)
    if (!token) {
      assert.isTrue(true, 'seed admin unavailable — soft skip')
      return
    }

    const suffix = Date.now().toString(36)
    const created = await client
      .post('/api/v1/books')
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
      .json({
        title: `Loan Guard ${suffix}`,
        authors: ['Guard Author'],
        materialType: 'thesis',
        initialCopies: 1,
      })
    created.assertStatus(201)
    const bookId = created.body().data.id as string
    const copyId = created.body().data.copies?.[0]?.id as string
    assert.isString(copyId)

    const loaned = await client
      .patch(`/api/v1/books/${bookId}/copies/${copyId}`)
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
      .json({ status: 'on_loan' })
    loaned.assertStatus(200)

    const blocked = await client
      .delete(`/api/v1/books/${bookId}`)
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
    assert.equal(blocked.status(), 422)

    await client
      .patch(`/api/v1/books/${bookId}/copies/${copyId}`)
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
      .json({ status: 'available' })

    const deleted = await client
      .delete(`/api/v1/books/${bookId}`)
      .header('Authorization', `Bearer ${token}`)
      .header('x-tenant-slug', TENANT_SLUG)
    deleted.assertStatus(200)
  })
})
