import { DateTime } from 'luxon'
import Invoice from '#modules/documents/models/invoice'
import { InvoiceStatus } from '#modules/documents/domain/enums/index'
import type { InvoiceSyncPayload } from '#modules/documents/domain/billing/billing_types'
import { billingRepository } from '#infrastructure/repositories/billing_repository'

export class InvoiceService {
  async generateInvoiceNumber(): Promise<string> {
    const year = DateTime.now().toFormat('yyyy')
    const prefix = `INV-${year}-`
    const latest = await Invoice.query()
      .where('invoice_number', 'like', `${prefix}%`)
      .orderBy('invoice_number', 'desc')
      .first()

    const nextSequence = latest
      ? Number(latest.invoiceNumber.replace(prefix, '')) + 1
      : 1

    return `${prefix}${String(nextSequence).padStart(5, '0')}`
  }

  async syncFromProvider(payload: InvoiceSyncPayload): Promise<Invoice> {
    const existing =
      payload.providerInvoiceId &&
      (await Invoice.query()
        .where('provider', payload.provider)
        .where('provider_invoice_id', payload.providerInvoiceId)
        .first())

    if (existing) {
      existing.merge({
        amount: payload.amount,
        taxAmount: payload.taxAmount,
        currency: payload.currency,
        status: payload.status,
        dueDate: payload.dueDate ? DateTime.fromISO(payload.dueDate) : null,
        paidAt: payload.paidAt ? DateTime.fromISO(payload.paidAt) : null,
        pdfUrl: payload.pdfUrl ?? existing.pdfUrl,
        lineItems: payload.lineItems,
      })
      await existing.save()
      return existing
    }

    return Invoice.create({
      tenantId: payload.tenantId,
      subscriptionId: payload.subscriptionId ?? null,
      invoiceNumber: payload.invoiceNumber || (await this.generateInvoiceNumber()),
      amount: payload.amount,
      taxAmount: payload.taxAmount,
      currency: payload.currency,
      status: payload.status,
      provider: payload.provider,
      providerInvoiceId: payload.providerInvoiceId,
      dueDate: payload.dueDate ? DateTime.fromISO(payload.dueDate) : null,
      paidAt: payload.paidAt ? DateTime.fromISO(payload.paidAt) : null,
      pdfUrl: payload.pdfUrl ?? null,
      lineItems: payload.lineItems,
    })
  }

  async createManualInvoice(input: {
    tenantId: string
    subscriptionId?: string | null
    amount: number
    taxAmount?: number
    currency: string
    lineItems: Array<{ description: string; amount: number; quantity: number }>
    couponId?: string | null
  }) {
    return Invoice.create({
      tenantId: input.tenantId,
      subscriptionId: input.subscriptionId ?? null,
      invoiceNumber: await this.generateInvoiceNumber(),
      amount: input.amount,
      taxAmount: input.taxAmount ?? 0,
      currency: input.currency,
      status: InvoiceStatus.OPEN,
      dueDate: DateTime.now().plus({ days: 14 }),
      lineItems: input.lineItems,
      couponId: input.couponId ?? null,
      provider: 'internal',
      providerInvoiceId: null,
    })
  }

  async listForTenant(tenantId: string, page = 1, limit = 20) {
    return billingRepository.listInvoices(tenantId, page, limit)
  }

  async getForTenant(tenantId: string, invoiceId: string) {
    return billingRepository.findInvoiceForTenant(tenantId, invoiceId)
  }

  serialize(invoice: Invoice) {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.amount),
      taxAmount: Number(invoice.taxAmount),
      currency: invoice.currency,
      status: invoice.status,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      pdfUrl: invoice.pdfUrl,
      lineItems: invoice.lineItems,
      createdAt: invoice.createdAt,
    }
  }

  buildPdfPayload(invoice: Invoice) {
    const lines = invoice.lineItems ?? []
    const subtotal = lines.reduce((sum, line) => sum + line.amount * line.quantity, 0)

    return {
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: invoice.createdAt.toISO(),
      dueDate: invoice.dueDate?.toISO() ?? null,
      currency: invoice.currency,
      lineItems: lines,
      subtotal,
      taxAmount: Number(invoice.taxAmount),
      total: Number(invoice.amount),
      status: invoice.status,
      notice:
        'Payment processed via PCI-compliant provider checkout. No card data is stored on CDTS servers.',
    }
  }
}

export const invoiceService = new InvoiceService()
