import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'
import { amountWords } from '#modules/finance/services/ufms/receivables_service'
import { financialReportingService } from '#modules/finance/services/ufms/financial_reporting_service'

function esc(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function shell(title: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
body{font-family:Georgia,serif;margin:24px;color:#111}
h1{font-size:20px;margin:0 0 8px}h2{font-size:14px;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.04em}
table{border-collapse:collapse;width:100%;margin-top:8px}th,td{border:1px solid #333;padding:6px;font-size:12px;text-align:left}
.meta{font-size:13px;line-height:1.5}.muted{color:#555}.right{text-align:right}
@media print{button{display:none}}
</style></head><body>
<button onclick="window.print()">Print</button>
${body}
</body></html>`
}

function buildSimplePdf(text: string): Buffer {
  const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const lines = escaped.split('\n')
  let content = 'BT /F1 10 Tf 50 750 Td 14 TL\n'
  for (const line of lines.slice(0, 60)) content += `(${line}) Tj T*\n`
  content += 'ET'
  const objects: string[] = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj',
    `4 0 obj<< /Length ${Buffer.byteLength(content)} >>stream\n${content}\nendstream endobj`,
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${obj}\n`
  }
  const xrefPos = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`
  return Buffer.from(pdf)
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return ''
  const keys = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [keys.join(','), ...rows.map((r) => keys.map((k) => escape(r[k])).join(','))].join('\n')
}

export class OfficialFormsService {
  async officialReceipt(organizationId: string, orId: string, format: 'html' | 'pdf' = 'html') {
    const receipt = await db.from(t('official_receipts')).where({ id: orId, organization_id: organizationId }).first()
    if (!receipt) throw Object.assign(new Error('Official receipt not found'), { status: 404 })
    const payment = await db.from(t('student_payments')).where('or_id', orId).first()
    const title = `Official Receipt ${receipt.or_number}`
    const html = shell(
      title,
      `<h1>Western Mindanao State University</h1>
       <h2>Official Receipt</h2>
       <div class="meta">
         <p><strong>OR No:</strong> ${esc(receipt.or_number)}</p>
         <p><strong>Date:</strong> ${esc(receipt.issued_at)}</p>
         <p><strong>Received from:</strong> ${esc(receipt.payer_name)}</p>
         <p><strong>Student / Ref:</strong> ${esc(receipt.payer_reference)}</p>
         <p><strong>Particulars:</strong> ${esc(receipt.particulars ?? payment?.payment_type ?? 'Collection')}</p>
         <p><strong>Amount:</strong> ₱${Number(receipt.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
         <p><strong>Amount in words:</strong> ${esc(amountWords(Number(receipt.amount)))}</p>
         <p class="muted">Assessment: ${esc(payment?.assessment_number ?? '—')}</p>
       </div>`
    )
    if (format === 'pdf') {
      return {
        contentType: 'application/pdf',
        body: buildSimplePdf(
          [
            'WMSU Official Receipt',
            `OR No: ${receipt.or_number}`,
            `Date: ${receipt.issued_at}`,
            `Payer: ${receipt.payer_name}`,
            `Amount: ${receipt.amount}`,
            amountWords(Number(receipt.amount)),
          ].join('\n')
        ),
        filename: `${receipt.or_number}.pdf`,
        html,
      }
    }
    return { contentType: 'text/html', body: html, filename: `${receipt.or_number}.html` }
  }

  async disbursementVoucher(organizationId: string, dvId: string, format: 'html' | 'pdf' = 'html') {
    const dv = await db.from(t('disbursement_vouchers')).where({ id: dvId, organization_id: organizationId }).first()
    if (!dv) throw Object.assign(new Error('Disbursement voucher not found'), { status: 404 })
    const title = `Disbursement Voucher ${dv.dv_number}`
    const html = shell(
      title,
      `<h1>Western Mindanao State University</h1>
       <h2>Disbursement Voucher</h2>
       <div class="meta">
         <p><strong>DV No:</strong> ${esc(dv.dv_number)}</p>
         <p><strong>Status:</strong> ${esc(dv.status)}</p>
         <p><strong>Payee:</strong> ${esc(dv.payee_name)}</p>
         <p><strong>Mode:</strong> ${esc(dv.payment_mode)}</p>
         <p><strong>Gross:</strong> ₱${Number(dv.gross_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
         <p><strong>Withholding:</strong> ₱${Number(dv.withholding_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
         <p><strong>Net:</strong> ₱${Number(dv.net_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
         <p><strong>Amount in words:</strong> ${esc(amountWords(Number(dv.net_amount)))}</p>
         <p class="muted">Approved: ${esc(dv.approved_at ?? '—')} | Paid: ${esc(dv.paid_at ?? '—')}</p>
       </div>`
    )
    if (format === 'pdf') {
      return {
        contentType: 'application/pdf',
        body: buildSimplePdf(
          [
            'WMSU Disbursement Voucher',
            `DV: ${dv.dv_number}`,
            `Payee: ${dv.payee_name}`,
            `Net: ${dv.net_amount}`,
            amountWords(Number(dv.net_amount)),
          ].join('\n')
        ),
        filename: `${dv.dv_number}.pdf`,
        html,
      }
    }
    return { contentType: 'text/html', body: html, filename: `${dv.dv_number}.html` }
  }

  async budgetPlan(organizationId: string, planId: string) {
    const plan = await db.from(t('financial_plans')).where({ id: planId, organization_id: organizationId }).first()
    if (!plan) throw Object.assign(new Error('Budget plan not found'), { status: 404 })
    const lines = await db.from(t('budget_lines')).where('financial_plan_id', planId).orderBy('created_at')
    const rows = lines
      .map(
        (l, i) =>
          `<tr><td>${i + 1}</td><td>${esc(l.uacs_code ?? l.account_code ?? '')}</td><td>${esc(l.description ?? '')}</td><td class="right">${Number(l.amount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>`
      )
      .join('')
    const html = shell(
      `APP/WFP ${plan.code ?? plan.id}`,
      `<h1>Western Mindanao State University</h1>
       <h2>${esc(plan.plan_type ?? 'Budget Plan')} — APP / WFP</h2>
       <div class="meta">
         <p><strong>Code:</strong> ${esc(plan.code)}</p>
         <p><strong>Title:</strong> ${esc(plan.title ?? plan.name ?? '')}</p>
         <p><strong>Fiscal Year:</strong> ${esc(plan.fiscal_year)}</p>
         <p><strong>Status:</strong> ${esc(plan.status)}</p>
       </div>
       <table><thead><tr><th>#</th><th>UACS</th><th>Description</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>`
    )
    return { contentType: 'text/html', body: html, filename: `budget-${plan.code ?? planId}.html` }
  }

  async bfarPack(organizationId: string, fiscalYear?: string) {
    const year = fiscalYear ?? String(DateTime.now().year)
    const saob = await financialReportingService.saobSummary(organizationId, year)
    const budgetVsActual = await financialReportingService.budgetVsActual(organizationId, year)
    const html = shell(
      `BFAR/BED ${year}`,
      `<h1>Western Mindanao State University</h1>
       <h2>Budget and Financial Accountability Reports (BFAR / BED pack)</h2>
       <div class="meta"><p>Fiscal Year: ${esc(year)} | Generated: ${esc(DateTime.now().toISO())}</p></div>
       <h2>SAOB Summary</h2>
       <pre>${esc(JSON.stringify(saob, null, 2))}</pre>
       <h2>Budget vs Actual</h2>
       <pre>${esc(JSON.stringify(budgetVsActual, null, 2))}</pre>`
    )
    return { contentType: 'text/html', body: html, filename: `bfar-bed-${year}.html` }
  }

  async birWithholding(organizationId: string) {
    const entries = await db
      .from(t('tax_withholding_entries'))
      .where('organization_id', organizationId)
      .orderBy('transaction_date', 'desc')
      .limit(500)
    const rows = entries.map((e) => ({
      payee: e.payee_name,
      reference: e.payee_ref,
      gross: e.gross_amount,
      rate: e.rate_percent,
      tax: e.tax_amount,
      date: e.transaction_date,
      remittanceStatus: e.remittance_status,
    }))
    return {
      contentType: 'text/csv',
      body: toCsv(rows),
      filename: `bir-withholding-${DateTime.now().toISODate()}.csv`,
    }
  }

  async agencyCsv(organizationId: string, agency: 'ebudget' | 'btms' | 'engas') {
    if (agency === 'ebudget') {
      const lines = await db.from(t('budget_lines')).where('organization_id', organizationId)
      return {
        contentType: 'text/csv',
        body: toCsv(lines as Record<string, unknown>[]),
        filename: `dbm-ebudget-${DateTime.now().toISODate()}.csv`,
      }
    }
    if (agency === 'btms') {
      const obligations = await db.from(t('budget_obligations')).where('organization_id', organizationId)
      return {
        contentType: 'text/csv',
        body: toCsv(obligations as Record<string, unknown>[]),
        filename: `dbm-btms-${DateTime.now().toISODate()}.csv`,
      }
    }
    const gl = await db.from(t('general_ledger_entries')).where('organization_id', organizationId).limit(5000)
    return {
      contentType: 'text/csv',
      body: toCsv(gl as Record<string, unknown>[]),
      filename: `coa-engas-${DateTime.now().toISODate()}.csv`,
    }
  }
}

export const officialFormsService = new OfficialFormsService()
