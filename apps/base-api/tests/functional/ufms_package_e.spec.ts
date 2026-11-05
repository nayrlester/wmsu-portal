import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/finance/helpers/db_schema'

test.group('UFMS Package E AP disbursement', () => {
  test('PO → delivery → IAR → invoice match → DV → approve → cheque', async ({ client, assert }) => {
    const org = await db.from(t('organizations')).first()
    assert.isNotNull(org)

    const login = await client.post('/api/v1/finance/auth/login').json({
      email: 'admin@uims.local',
      password: 'ChangeMe123!',
    })
    login.assertStatus(200)
    const token = login.body().data.tokens.accessToken as string
    const suffix = Date.now().toString().slice(-6)

    const vendor = await client
      .post('/api/v1/finance/procurement/vendors')
      .bearerToken(token)
      .json({
        code: `V-E-${suffix}`,
        name: 'Package E Vendor',
        active: true,
        eligibilityValidUntil: '2099-12-31',
      })
    vendor.assertStatus(201)
    const supplierId = vendor.body().data.id as string

    const po = await client
      .post('/api/v1/finance/procurement/orders')
      .bearerToken(token)
      .json({
        supplierId,
        totalAmount: 1500,
        lines: [{ description: 'Office supplies', quantity: 1, unitCost: 1500 }],
      })
    po.assertStatus(201)
    const poId = po.body().data.id as string

    await client.post(`/api/v1/finance/procurement/orders/${poId}/approve`).bearerToken(token)
    await client.post(`/api/v1/finance/procurement/orders/${poId}/issue`).bearerToken(token)

    const poShow = await client.get(`/api/v1/finance/procurement/orders/${poId}`).bearerToken(token)
    poShow.assertStatus(200)
    const poLines = (poShow.body().data.lines ?? []) as Array<{ id: string; quantity?: number | string }>

    const delivery = await client
      .post('/api/v1/finance/procurement/deliveries')
      .bearerToken(token)
      .json({
        purchaseOrderId: poId,
        deliveredOn: new Date().toISOString(),
        lines: poLines.length
          ? poLines.map((line) => ({
              purchaseOrderLineId: line.id,
              quantityDelivered: String(line.quantity ?? 1),
            }))
          : [{ quantityDelivered: '1' }],
      })
    if (delivery.status() !== 201) {
      assert.fail(`delivery failed: ${delivery.status()} ${JSON.stringify(delivery.body())}`)
    }
    const deliveryId = delivery.body().data.id as string

    const iar = await client
      .post('/api/v1/finance/procurement/iars')
      .bearerToken(token)
      .json({
        purchaseOrderId: poId,
        deliveryId,
        result: 'accepted',
      })
    iar.assertStatus(201)
    const iarId = iar.body().data.id as string

    const invoice = await client
      .post('/api/v1/finance/disbursement/invoices')
      .bearerToken(token)
      .json({
        purchaseOrderId: poId,
        iarId,
        invoiceNumber: `INV-E-${suffix}`,
        amount: 1500,
      })
    invoice.assertStatus(201)
    const invoiceId = invoice.body().data.id as string

    const match = await client
      .post(`/api/v1/finance/disbursement/invoices/${invoiceId}/match`)
      .bearerToken(token)
    match.assertStatus(200)
    assert.isTrue(Boolean(match.body().data.matched))

    const dv = await client
      .post('/api/v1/finance/disbursement/vouchers')
      .bearerToken(token)
      .json({ vendorInvoiceId: invoiceId, paymentMode: 'cheque' })
    dv.assertStatus(201)
    assert.equal(dv.body().data.status, 'draft')
    const dvId = dv.body().data.id as string

    const approve = await client
      .post(`/api/v1/finance/disbursement/vouchers/${dvId}/approve`)
      .bearerToken(token)
    approve.assertStatus(200)
    assert.equal(approve.body().data.status, 'approved')

    const cheque = await client
      .post(`/api/v1/finance/disbursement/vouchers/${dvId}/cheque`)
      .bearerToken(token)
      .json({ chequeNumber: `CHQ-${suffix}` })
    cheque.assertStatus(201)

    const orgs = await db.from(t('cheque_register')).where('organization_id', org.id).orderBy('created_at', 'desc').first()
    assert.isNotNull(orgs)
  })
})
