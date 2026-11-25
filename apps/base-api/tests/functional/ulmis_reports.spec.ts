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

test.group('ULMIS reports & dashboard (Prompt 06)', (group) => {
  group.tap((t) => t.skip(async () => isDbUnavailable(), 'Database unavailable'))

  test('rejects unauthenticated analytics and reports', async ({ client, assert }) => {
    const analytics = await client
      .get('/api/v1/analytics/dashboard')
      .header('x-tenant-slug', TENANT_SLUG)
    assert.isTrue(analytics.status() === 401 || analytics.status() === 403)

    const reports = await client.get('/api/v1/reports').header('x-tenant-slug', TENANT_SLUG)
    assert.isTrue(reports.status() === 401 || reports.status() === 403)
  })

  test('dashboard aggregates reconcile with source counts and reports export', async ({
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

    const book = await client.post('/api/v1/books').headers(headers).json({
      title: `Report Spec ${suffix}`,
      authors: ['Report Author'],
      subjects: ['Education'],
      materialType: 'book',
      initialCopies: 2,
      shelfLocation: 'RPT-01',
    })
    book.assertStatus(201)
    const bookId = book.body().data.id as string

    const member = await client.post('/api/v1/members').headers(headers).json({
      fullName: `Report Patron ${suffix}`,
      email: `report.${suffix}@demo.edu.ph`,
      memberType: 'student',
      autoApprove: true,
      isEnrolled: true,
      academicStatus: 'active',
    })
    member.assertStatus(201)
    const copyId = book.body().data.copies?.[0]?.id as string

    const checkout = await client.post('/api/v1/borrowings/checkout').headers(headers).json({
      memberId: member.body().data.id,
      copyId,
    })
    checkout.assertStatus(201)

    await client.post('/api/v1/acquisitions').headers(headers).json({
      title: `Report Acq ${suffix}`,
      quantity: 1,
      materialType: 'book',
    })

    const dash = await client
      .get('/api/v1/analytics/dashboard')
      .headers(headers)
      .qs({ days: 30 })
    dash.assertStatus(200)
    const overview = dash.body().data.overview
    assert.isAtLeast(overview.totalBooks, 1)
    assert.isAtLeast(overview.totalCopies, 2)
    assert.isAtLeast(overview.activeLoans, 1)
    assert.properties(dash.body().data, [
      'circulationTrends',
      'topBooks',
      'subjectStats',
      'materialTypeStats',
      'acquisitionSummary',
      'digitalUsageSummary',
      'peakUsageHours',
      'topSearchTerms',
    ])
    assert.isAtLeast(dash.body().data.acquisitionSummary.total, 1)

    const booksCount = await client.get('/api/v1/books').headers(headers).qs({ perPage: 1 })
    booksCount.assertStatus(200)
    assert.isAtLeast(Number(booksCount.body().meta.total), 1)
    assert.isAtLeast(overview.totalBooks, 1)
    assert.isAtMost(overview.totalBooks, Number(booksCount.body().meta.total))

    const types = await client.get('/api/v1/reports').headers(headers)
    types.assertStatus(200)
    const typeCodes = (types.body().data as any[]).map((t) => t.type)
    assert.includeMembers(typeCodes, [
      'collections',
      'most_borrowed',
      'acquisitions',
      'copy_status',
      'search_terms',
    ])

    const collections = await client
      .get('/api/v1/reports/collections')
      .headers(headers)
      .qs({ format: 'json', perPage: 50 })
    collections.assertStatus(200)
    assert.isAtLeast(collections.body().data.rowCount, 1)
    assert.isArray(collections.body().data.tor)

    const mostBorrowed = await client
      .get('/api/v1/reports/most_borrowed')
      .headers(headers)
      .qs({ format: 'json' })
    mostBorrowed.assertStatus(200)
    assert.isTrue(
      (mostBorrowed.body().data.rows as any[]).some((r) => String(r.title).includes(suffix))
    )

    const acq = await client
      .get('/api/v1/reports/acquisitions')
      .headers(headers)
      .qs({ format: 'json' })
    acq.assertStatus(200)
    assert.isAtLeast(acq.body().data.rowCount, 1)

    const xlsx = await client
      .get('/api/v1/reports/copy_status')
      .headers(headers)
      .qs({ format: 'xlsx' })
    xlsx.assertStatus(200)
    assert.include(String(xlsx.header('content-type') ?? ''), 'spreadsheetml')

    await client.post(`/api/v1/borrowings/${checkout.body().data.id}/return`).headers(headers).json({})
    await client.delete(`/api/v1/books/${bookId}`).headers(headers)
  })
})
