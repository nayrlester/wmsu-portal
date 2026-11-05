import { test } from '@japa/runner'

const serviceKey = process.env.SERVICE_API_KEY ?? 'dev-service-api-change-me'

test.group('CIS Integration API', () => {
  test('overview lists capabilities and ownership', async ({ client, assert }) => {
    const response = await client.get('/api/v1/integration/overview')
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
    assert.include(response.body().data.capabilities, 'clearance-foundation')
    assert.equal(response.body().data.ownershipBoundaries.enrollmentAcademic, 'usis')
    assert.equal(response.body().data.ownershipBoundaries.financialTransactions, 'ufms')
  })

  test('rejects event publish without service key', async ({ client }) => {
    const response = await client.post('/api/v1/integration/events').json({
      eventType: 'integration.ping',
      aggregateType: 'integration',
      aggregateId: 'x',
      payload: {},
      idempotencyKey: 'no-auth-key-0001',
    })
    response.assertStatus(401)
  })

  test('publishes domain event idempotently', async ({ client, assert }) => {
    const key = `evt-test-${Date.now()}`
    const body = {
      eventType: 'integration.ping',
      aggregateType: 'integration',
      aggregateId: 'ping-test',
      payload: { source: 'japa' },
      idempotencyKey: key,
    }
    const first = await client
      .post('/api/v1/integration/events')
      .header('x-service-api-key', serviceKey)
      .header('x-source-system', 'japa')
      .json(body)
    first.assertStatus(200)
    assert.isFalse(first.body().data.deduplicated)

    const second = await client
      .post('/api/v1/integration/events')
      .header('x-service-api-key', serviceKey)
      .header('x-source-system', 'japa')
      .json(body)
    second.assertStatus(200)
    assert.isTrue(second.body().data.deduplicated)
  })

  test('records clearance requirement and evaluates TOR statuses', async ({ client, assert }) => {
    const subjectKey = `DEV-STU-${Date.now()}`
    const key = `clr-${subjectKey}`
    const response = await client
      .post('/api/v1/integration/clearance/requirements')
      .header('x-service-api-key', serviceKey)
      .header('x-source-system', 'usis')
      .header('idempotency-key', key)
      .json({
        requirementTypeCode: 'DEV-ACAD-HOLD',
        subjectKey,
        status: 'With Deficiency',
        notes: 'DEV test deficiency',
        sourceSystem: 'usis',
        idempotencyKey: key,
      })
    response.assertStatus(200)
    assert.equal(response.body().data.requirement.status, 'With Deficiency')
    assert.equal(response.body().data.evaluation.overallStatus, 'With Deficiency')

    const replay = await client
      .post('/api/v1/integration/clearance/requirements')
      .header('x-service-api-key', serviceKey)
      .header('idempotency-key', key)
      .json({
        requirementTypeCode: 'DEV-ACAD-HOLD',
        subjectKey,
        status: 'With Deficiency',
        sourceSystem: 'usis',
        idempotencyKey: key,
      })
    replay.assertStatus(200)
    assert.equal(replay.body().data.requirement.id, response.body().data.requirement.id)

    const evalRes = await client.get(`/api/v1/integration/clearance/${subjectKey}`)
    evalRes.assertStatus(200)
    assert.equal(evalRes.body().data.overallStatus, 'With Deficiency')
  })

  test('blocks clearance types pending university approval', async ({ client }) => {
    const response = await client
      .post('/api/v1/integration/clearance/requirements')
      .header('x-service-api-key', serviceKey)
      .json({
        requirementTypeCode: 'DEV-OTHER-PENDING',
        subjectKey: 'DEV-STU-PENDING',
        status: 'Cleared',
        sourceSystem: 'other',
        idempotencyKey: `pending-${Date.now()}`,
      })
    response.assertStatus(409)
  })

  test('critical echo requires idempotency and deduplicates', async ({ client, assert }) => {
    const missing = await client
      .post('/api/v1/integration/critical/echo')
      .header('x-service-api-key', serviceKey)
      .json({ operation: 'finance.or', reference: 'REF-1' })
    missing.assertStatus(400)

    const key = `crit-${Date.now()}`
    const first = await client
      .post('/api/v1/integration/critical/echo')
      .header('x-service-api-key', serviceKey)
      .header('idempotency-key', key)
      .json({ operation: 'finance.or', reference: 'REF-1', amount: 100 })
    first.assertStatus(200)
    assert.isTrue(first.body().data.accepted)

    const second = await client
      .post('/api/v1/integration/critical/echo')
      .header('x-service-api-key', serviceKey)
      .header('idempotency-key', key)
      .json({ operation: 'finance.or', reference: 'REF-1', amount: 100 })
    second.assertStatus(200)
    assert.deepEqual(second.body().data, first.body().data)
  })

  test('stores file metadata via storage abstraction', async ({ client, assert }) => {
    const response = await client
      .post('/api/v1/integration/files')
      .header('x-service-api-key', serviceKey)
      .json({
        fileName: 'dev-note.txt',
        contentBase64: Buffer.from('hello cis').toString('base64'),
        contentType: 'text/plain',
        ownerType: 'test',
        ownerId: 'japa',
      })
    response.assertStatus(201)
    assert.equal(response.body().data.original_name, 'dev-note.txt')
    assert.isAtLeast(Number(response.body().data.byte_size), 1)
  })
})
