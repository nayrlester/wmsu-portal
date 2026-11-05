import { test } from '@japa/runner'

test.group('MDM API', () => {
  test('overview returns ownership and counts', async ({ client, assert }) => {
    const response = await client.get('/api/v1/mdm/overview')
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
    assert.equal(response.body().data.ownership.studentAcademicSoR, 'usis')
    assert.isAtLeast(response.body().data.counts.universities, 1)
  })

  test('lists seeded universities', async ({ client, assert }) => {
    const response = await client.get('/api/v1/mdm/universities')
    response.assertStatus(200)
    const rows = response.body().data
    assert.isArray(rows)
    assert.isTrue(rows.some((row: { code: string }) => row.code === 'DEV-WMSU'))
  })

  test('rejects campus create without admin key', async ({ client }) => {
    const response = await client.post('/api/v1/mdm/campuses').json({
      universityId: 'a1111111-1111-4111-8111-111111111111',
      code: 'DEV-NOAUTH',
      name: 'Should Fail',
    })
    response.assertStatus(401)
  })

  test('creates campus with admin key and unique code', async ({ client, assert }) => {
    const code = `DEV-T${Date.now().toString().slice(-6)}`
    const response = await client
      .post('/api/v1/mdm/campuses')
      .header('x-mdm-admin-key', process.env.MDM_ADMIN_API_KEY ?? 'dev-mdm-admin-change-me')
      .json({
        universityId: 'a1111111-1111-4111-8111-111111111111',
        code,
        name: 'DEV Test Campus (Seed)',
      })
    response.assertStatus(201)
    assert.equal(response.body().data.code, code)

    const conflict = await client
      .post('/api/v1/mdm/campuses')
      .header('x-mdm-admin-key', process.env.MDM_ADMIN_API_KEY ?? 'dev-mdm-admin-change-me')
      .json({
        universityId: 'a1111111-1111-4111-8111-111111111111',
        code,
        name: 'DEV Duplicate',
      })
    conflict.assertStatus(409)
  })

  test('student identity list includes ownership note', async ({ client, assert }) => {
    const response = await client.get('/api/v1/mdm/student-identity-refs')
    response.assertStatus(200)
    assert.match(response.body().data.note, /USiS/i)
  })
})
