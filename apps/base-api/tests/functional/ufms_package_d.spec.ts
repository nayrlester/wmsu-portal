import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/finance/helpers/db_schema'

test.group('UFMS Package D receivables', (group) => {
  group.each.setup(async () => {
    process.env.SERVICE_API_KEY = process.env.SERVICE_API_KEY ?? 'dev-service-api-change-me'
  })

  test('assessment intake opens AR and cashier issues controlled OR', async ({ client, assert }) => {
    const org = await db.from(t('organizations')).first()
    assert.isNotNull(org)

    const assessmentNumber = `ASM-TEST-${Date.now()}`
    const submit = await client
      .post('/api/v1/finance/internal/assessments')
      .header('X-Service-Api-Key', process.env.SERVICE_API_KEY!)
      .json({
        organizationId: org.id,
        studentNumber: '2026-00001',
        assessmentNumber,
        usisAssessmentId: 'usis-1',
        enrollmentRef: 'enr-1',
        tuitionFee: 10000,
        miscFees: 500,
        discount: 0,
        totalAmount: 10500,
        netAmount: 10500,
        breakdown: {},
        assessedAt: new Date().toISOString(),
        idempotencyKey: `test-${assessmentNumber}`,
      })

    submit.assertStatus(201)

    const ar = await db
      .from(t('student_ar_open_items'))
      .where({ organization_id: org.id, assessment_number: assessmentNumber })
      .first()
    assert.isNotNull(ar)
    assert.equal(Number(ar.open_amount), 10500)

    const pay = await client
      .post('/api/v1/finance/internal/cashier/payments')
      .header('X-Service-Api-Key', process.env.SERVICE_API_KEY!)
      .header('Idempotency-Key', `pay-${assessmentNumber}`)
      .json({
        organizationId: org.id,
        studentNumber: '2026-00001',
        amount: 10500,
        assessmentNumber,
        paymentType: 'tuition',
        reference: `pay-${assessmentNumber}`,
      })

    pay.assertStatus(201)
    const payBody = pay.body()
    assert.match(String(payBody.data.receipt.or_number), /^OR\d+/)

    const status = await client
      .get(`/api/v1/finance/internal/assessments/${assessmentNumber}/payment-status`)
      .header('X-Service-Api-Key', process.env.SERVICE_API_KEY!)
      .qs({ organizationId: org.id })

    status.assertStatus(200)
    assert.equal(status.body().data.paymentStatus, 'paid')
    assert.match(String(status.body().data.payments[0].orNumber), /^OR\d+/)
  })
})
