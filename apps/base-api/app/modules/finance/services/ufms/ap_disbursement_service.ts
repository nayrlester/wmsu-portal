import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'
import PurchaseOrder from '#modules/finance/models/purchase_order'
import InspectionAcceptanceReport from '#modules/finance/models/inspection_acceptance_report'
import Supplier from '#modules/finance/models/supplier'
import TaxWithholdingRate from '#modules/finance/models/tax_withholding_rate'
import { amountWords } from '#modules/finance/services/ufms/receivables_service'
import { auditLogService } from '#modules/finance/services/audit_log_service'
import { cmpMoney, fromCents, toCents } from '#modules/finance/helpers/money'

type Actor = { id: string; organizationId: string }

function seq(prefix: string) {
  return `${prefix}-${DateTime.now().toFormat('yyyyLLdd')}-${Date.now().toString(36).toUpperCase()}`
}

export class ApDisbursementService {
  async createVendorInvoice(actor: Actor, payload: Record<string, unknown>) {
    const po = await PurchaseOrder.query()
      .where('organizationId', actor.organizationId)
      .where('id', String(payload.purchaseOrderId))
      .first()
    if (!po) throw Object.assign(new Error('Purchase order not found'), { status: 404 })

    const iar = payload.iarId
      ? await InspectionAcceptanceReport.query()
          .where('organizationId', actor.organizationId)
          .where('id', String(payload.iarId))
          .first()
      : null

    const amount = fromCents(toCents(payload.amount))
    const [invoice] = await db
      .table(t('vendor_invoices'))
      .insert({
        organization_id: actor.organizationId,
        supplier_id: po.supplierId ?? (payload.supplierId as string | null) ?? null,
        purchase_order_id: po.id,
        iar_id: iar?.id ?? null,
        invoice_number: String(payload.invoiceNumber),
        amount,
        status: 'draft',
        match_status: 'pending',
        invoice_date: payload.invoiceDate ? new Date(String(payload.invoiceDate)) : new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*')

    await auditLogService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'create',
      entityType: 'vendor_invoices',
      entityId: invoice.id,
      metadata: { tor: 'FIN-016' },
    })
    return invoice
  }

  async threeWayMatch(actor: Actor, invoiceId: string) {
    const invoice = await db.from(t('vendor_invoices')).where('id', invoiceId).first()
    if (!invoice || invoice.organization_id !== actor.organizationId) {
      throw Object.assign(new Error('Invoice not found'), { status: 404 })
    }
    if (!invoice.purchase_order_id) {
      throw Object.assign(new Error('Invoice missing purchase order'), { status: 422 })
    }
    const po = await PurchaseOrder.query()
      .where('organizationId', actor.organizationId)
      .where('id', invoice.purchase_order_id)
      .first()
    if (!po) throw Object.assign(new Error('Purchase order not found'), { status: 404 })

    const iar = invoice.iar_id
      ? await InspectionAcceptanceReport.query()
          .where('organizationId', actor.organizationId)
          .where('id', invoice.iar_id)
          .first()
      : null

    const poAmount = fromCents(toCents(po.totalAmount))
    const invAmount = fromCents(toCents(invoice.amount))
    const iarOk = Boolean(iar && (iar.result === 'accepted' || iar.result === 'partial'))
    const amountOk = fromCents(toCents(poAmount)) === fromCents(toCents(invAmount)) || Number(invAmount) <= Number(poAmount) + 0.01
    const matched = iarOk && amountOk

    await db
      .from(t('vendor_invoices'))
      .where('id', invoiceId)
      .update({
        match_status: matched ? 'matched' : 'failed',
        status: matched ? 'approved' : invoice.status,
        updated_at: new Date(),
      })

    return { matched, poAmount, invoiceAmount: invAmount, iarAccepted: iarOk }
  }

  async createDisbursementVoucher(actor: Actor, payload: Record<string, unknown>) {
    const invoiceId = String(payload.vendorInvoiceId ?? '')
    const invoice = await db.from(t('vendor_invoices')).where('id', invoiceId).first()
    if (!invoice || invoice.organization_id !== actor.organizationId) {
      throw Object.assign(new Error('Vendor invoice not found'), { status: 404 })
    }
    if (invoice.match_status !== 'matched') {
      throw Object.assign(new Error('Three-way match required before DV'), { status: 422 })
    }

    const gross = fromCents(toCents(invoice.amount))
    let withholding = '0.00'
    const rate = await TaxWithholdingRate.query()
      .where('organizationId', actor.organizationId)
      .where('isActive', true)
      .orderBy('createdAt', 'desc')
      .first()
    if (rate) {
      withholding = fromCents((toCents(gross) * BigInt(Math.round(Number(rate.ratePercent) * 100))) / 10000n)
    }
    const net = fromCents(toCents(gross) - toCents(withholding))

    const supplier = invoice.supplier_id
      ? await Supplier.query().where('id', invoice.supplier_id).first()
      : null

    const [dv] = await db
      .table(t('disbursement_vouchers'))
      .insert({
        organization_id: actor.organizationId,
        dv_number: seq('DV'),
        vendor_invoice_id: invoice.id,
        obligation_id: (payload.obligationId as string | null | undefined) ?? null,
        payee_name: supplier?.name ?? String(payload.payeeName ?? 'Vendor'),
        gross_amount: gross,
        withholding_amount: withholding,
        net_amount: net,
        payment_mode: String(payload.paymentMode ?? 'cheque'),
        status: 'draft',
        udms_document_ref: (payload.udmsDocumentRef as string | null | undefined) ?? null,
        approved_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*')

    await db
      .from(t('vendor_invoices'))
      .where('id', invoice.id)
      .update({ status: 'vouchered', updated_at: new Date() })

    if (rate && cmpMoney(withholding, '0.00') > 0) {
      await db.table(t('tax_withholding_entries')).insert({
        organization_id: actor.organizationId,
        rate_id: rate.id,
        payee_name: supplier?.name ?? 'Vendor',
        payee_ref: invoice.invoice_number,
        gross_amount: gross,
        rate_percent: rate.ratePercent,
        tax_amount: withholding,
        transaction_date: DateTime.now().toISODate(),
        remittance_status: 'pending',
        created_by: actor.id,
        updated_by: actor.id,
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    return dv
  }

  async approveDisbursementVoucher(actor: Actor, dvId: string) {
    const dv = await db.from(t('disbursement_vouchers')).where('id', dvId).first()
    if (!dv || dv.organization_id !== actor.organizationId) {
      throw Object.assign(new Error('Disbursement voucher not found'), { status: 404 })
    }
    if (dv.status !== 'draft' && dv.status !== 'pending_approval') {
      throw Object.assign(new Error('Only draft or pending DVs can be approved'), { status: 422 })
    }
    const [updated] = await db
      .from(t('disbursement_vouchers'))
      .where('id', dv.id)
      .update({ status: 'approved', approved_at: new Date(), updated_at: new Date() })
      .returning('*')
    return updated
  }

  async issueCheque(actor: Actor, dvId: string, payload: Record<string, unknown>) {
    const dv = await db.from(t('disbursement_vouchers')).where('id', dvId).first()
    if (!dv || dv.organization_id !== actor.organizationId) {
      throw Object.assign(new Error('Disbursement voucher not found'), { status: 404 })
    }
    if (dv.status !== 'approved') {
      throw Object.assign(new Error('DV must be approved before issuing cheque'), { status: 422 })
    }
    const chequeNumber = String(payload.chequeNumber ?? seq('CHQ'))
    const amount = Number(dv.net_amount)
    const [cheque] = await db
      .table(t('cheque_register'))
      .insert({
        organization_id: actor.organizationId,
        disbursement_voucher_id: dv.id,
        bank_account_id: (payload.bankAccountId as string | null | undefined) ?? null,
        fund_id: (payload.fundId as string | null | undefined) ?? null,
        cheque_number: chequeNumber,
        payee_name: dv.payee_name,
        amount,
        amount_words: amountWords(amount),
        cheque_date: payload.chequeDate ? String(payload.chequeDate) : DateTime.now().toISODate(),
        status: 'issued',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*')

    await db
      .from(t('disbursement_vouchers'))
      .where('id', dv.id)
      .update({ status: 'paid', paid_at: new Date(), updated_at: new Date() })

    return cheque
  }

  async recordAdaPayment(actor: Actor, dvId: string, payload: Record<string, unknown>) {
    const dv = await db.from(t('disbursement_vouchers')).where('id', dvId).first()
    if (!dv || dv.organization_id !== actor.organizationId) {
      throw Object.assign(new Error('Disbursement voucher not found'), { status: 404 })
    }
    if (dv.status !== 'approved') {
      throw Object.assign(new Error('DV must be approved before ADA payment'), { status: 422 })
    }
    const [updated] = await db
      .from(t('disbursement_vouchers'))
      .where('id', dv.id)
      .update({
        payment_mode: 'ada',
        status: 'paid',
        paid_at: new Date(),
        udms_document_ref: (payload.bankReference as string | null | undefined) ?? dv.udms_document_ref,
        updated_at: new Date(),
      })
      .returning('*')
    return updated
  }

  async listVendorInvoices(organizationId: string, page = 1, limit = 50) {
    return db.from(t('vendor_invoices')).where('organization_id', organizationId).paginate(page, limit)
  }

  async listDisbursementVouchers(organizationId: string, page = 1, limit = 50) {
    return db.from(t('disbursement_vouchers')).where('organization_id', organizationId).paginate(page, limit)
  }

  async listCheques(organizationId: string, page = 1, limit = 50) {
    return db.from(t('cheque_register')).where('organization_id', organizationId).paginate(page, limit)
  }
}

export const apDisbursementService = new ApDisbursementService()
