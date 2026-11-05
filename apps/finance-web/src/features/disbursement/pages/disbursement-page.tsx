import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Pagination } from '@wmsu/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { PageHeader } from '@/components/ui/page-chrome'
import { getApiErrorMessage } from '@/lib/api-client'
import { listTotalLabel, useListControls, usePaginatedQuery } from '@/lib/list-query'
import { formatCurrency, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { fetchBankAccounts, fetchFunds } from '@/features/accounting/api/accounting-api'
import { fetchIars, fetchOrders } from '@/features/procurement/api/procurement-api'
import {
  approveDisbursementVoucher,
  createDisbursementInvoice,
  createDisbursementVoucher,
  fetchDisbursementCheques,
  fetchDisbursementInvoices,
  fetchDisbursementVouchers,
  issueDisbursementCheque,
  matchDisbursementInvoice,
  recordDisbursementAda,
} from '../api/disbursement-api'

type Tab = 'invoices' | 'vouchers' | 'cheques'

function hasPerm(permissions: string[], code: string) {
  return permissions.includes('*') || permissions.includes(code)
}

function rowVal(row: Record<string, unknown>, camel: string): unknown {
  const parts = camel.replace(/([A-Z])/g, '_$1').toLowerCase()
  return row[camel] ?? row[parts]
}

function rowStr(row: Record<string, unknown>, camel: string): string {
  const v = rowVal(row, camel)
  return v == null ? '' : String(v)
}

function matchVariant(status: string): 'success' | 'danger' | 'warning' | 'default' {
  if (status === 'matched') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'pending') return 'warning'
  return 'default'
}

function statusVariant(status: string): 'success' | 'danger' | 'warning' | 'default' {
  if (['approved', 'paid', 'issued', 'vouchered', 'matched'].includes(status)) return 'success'
  if (['failed', 'rejected', 'voided'].includes(status)) return 'danger'
  if (['draft', 'pending', 'pending_approval'].includes(status)) return 'warning'
  return 'default'
}

export function DisbursementPage() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore((s) => s.user?.permissions ?? [])
  const canRead = hasPerm(permissions, 'accounting.read')
  const canWrite = hasPerm(permissions, 'accounting.write')
  const canPost = hasPerm(permissions, 'accounting.post')

  const [tab, setTab] = useState<Tab>('invoices')
  const listControls = useListControls('', 20)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [showInvoice, setShowInvoice] = useState(false)
  const [showDv, setShowDv] = useState(false)
  const [chequeDvId, setChequeDvId] = useState<string | null>(null)
  const [adaDvId, setAdaDvId] = useState<string | null>(null)

  const [invoiceForm, setInvoiceForm] = useState({
    purchaseOrderId: '',
    iarId: '',
    invoiceNumber: '',
    amount: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
  })
  const [dvForm, setDvForm] = useState({
    vendorInvoiceId: '',
    paymentMode: 'cheque',
    obligationId: '',
    payeeName: '',
  })
  const [chequeForm, setChequeForm] = useState({
    chequeNumber: '',
    bankAccountId: '',
    fundId: '',
    chequeDate: new Date().toISOString().slice(0, 10),
  })
  const [adaForm, setAdaForm] = useState({ bankReference: '' })

  const invoicesQuery = usePaginatedQuery({
    queryKey: ['disb-invoices', listControls.page],
    queryFn: () =>
      fetchDisbursementInvoices({ page: listControls.page, limit: listControls.pageSize }),
    enabled: canRead && (tab === 'invoices' || showDv),
  })
  const vouchersQuery = usePaginatedQuery({
    queryKey: ['disb-vouchers', listControls.page],
    queryFn: () =>
      fetchDisbursementVouchers({ page: listControls.page, limit: listControls.pageSize }),
    enabled: canRead && tab === 'vouchers',
  })
  const chequesQuery = usePaginatedQuery({
    queryKey: ['disb-cheques', listControls.page],
    queryFn: () =>
      fetchDisbursementCheques({ page: listControls.page, limit: listControls.pageSize }),
    enabled: canRead && tab === 'cheques',
  })
  const activeMeta =
    tab === 'invoices'
      ? invoicesQuery.data?.meta
      : tab === 'vouchers'
        ? vouchersQuery.data?.meta
        : chequesQuery.data?.meta
  const ordersQuery = useQuery({
    queryKey: ['disb-orders'],
    queryFn: fetchOrders,
    enabled: canWrite && showInvoice,
  })
  const iarsQuery = useQuery({
    queryKey: ['disb-iars'],
    queryFn: fetchIars,
    enabled: canWrite && showInvoice,
  })
  const fundsQuery = useQuery({
    queryKey: ['disb-funds'],
    queryFn: fetchFunds,
    enabled: canPost && !!chequeDvId,
  })
  const banksQuery = useQuery({
    queryKey: ['disb-banks'],
    queryFn: fetchBankAccounts,
    enabled: canPost && !!chequeDvId,
  })

  async function refreshDisbursement() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['disb-invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['disb-vouchers'] }),
      queryClient.invalidateQueries({ queryKey: ['disb-cheques'] }),
    ])
  }

  async function wrap(fn: () => Promise<unknown>) {
    setError(null)
    setBusy(true)
    try {
      await fn()
      await refreshDisbursement()
    } catch (err) {
      setError(getApiErrorMessage(err))
      throw err
    } finally {
      setBusy(false)
    }
  }

  const poOptions = useMemo(
    () =>
      (ordersQuery.data ?? [])
        .filter((o: Record<string, unknown>) => {
          const status = rowStr(o, 'status')
          return status === 'issued' || status === 'partially_received'
        })
        .map((o: Record<string, unknown>) => ({
          value: rowStr(o, 'id'),
          label: `${rowStr(o, 'poNumber') || rowStr(o, 'po_number')} — ${formatCurrency(Number(rowVal(o, 'totalAmount') ?? rowVal(o, 'total_amount') ?? 0))}`,
        })),
    [ordersQuery.data]
  )

  const iarOptions = useMemo(() => {
    const poId = invoiceForm.purchaseOrderId
    return (iarsQuery.data ?? [])
      .filter((iar: Record<string, unknown>) => {
        if (!poId) return true
        return rowStr(iar, 'purchaseOrderId') === poId || rowStr(iar, 'purchase_order_id') === poId
      })
      .map((iar: Record<string, unknown>) => ({
        value: rowStr(iar, 'id'),
        label: `${rowStr(iar, 'iarNumber') || rowStr(iar, 'iar_number')} — ${rowStr(iar, 'result')}`,
      }))
  }, [iarsQuery.data, invoiceForm.purchaseOrderId])

  const matchedInvoiceOptions = useMemo(
    () =>
      (invoicesQuery.data?.data ?? [])
        .filter(
          (inv: Record<string, unknown>) =>
            rowStr(inv, 'matchStatus') === 'matched' || rowStr(inv, 'match_status') === 'matched'
        )
        .filter((inv: Record<string, unknown>) => {
          const status = rowStr(inv, 'status')
          return status !== 'vouchered' && status !== 'paid'
        })
        .map((inv: Record<string, unknown>) => ({
          value: rowStr(inv, 'id'),
          label: `${rowStr(inv, 'invoiceNumber') || rowStr(inv, 'invoice_number')} — ${formatCurrency(Number(rowVal(inv, 'amount') ?? 0))}`,
        })),
    [invoicesQuery.data]
  )

  const fundOptions = useMemo(
    () =>
      (fundsQuery.data ?? []).map((f: Record<string, unknown>) => ({
        value: rowStr(f, 'id'),
        label: `${rowStr(f, 'fundCode') || rowStr(f, 'fund_code')} — ${rowStr(f, 'fundName') || rowStr(f, 'fund_name')}`,
      })),
    [fundsQuery.data]
  )

  const bankOptions = useMemo(
    () =>
      (banksQuery.data ?? []).map((b: Record<string, unknown>) => ({
        value: rowStr(b, 'id'),
        label: `${rowStr(b, 'accountName') || rowStr(b, 'account_name') || rowStr(b, 'bankName') || rowStr(b, 'bank_name')} — ${rowStr(b, 'accountNumber') || rowStr(b, 'account_number')}`,
      })),
    [banksQuery.data]
  )

  const tabs: { id: Tab; label: string }[] = [
    { id: 'invoices', label: 'Invoices' },
    { id: 'vouchers', label: 'Vouchers' },
    { id: 'cheques', label: 'Cheques' },
  ]

  if (!canRead) {
    return (
      <div className="space-y-4 animate-fade-up">
        <PageHeader
          title="AP & Disbursement"
          description="Vendor invoices, three-way match, disbursement vouchers, cheque issuance, and ADA recording."
        />
        <p className="text-sm text-slate-600">
          You need accounting.read permission to view AP and disbursement records.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-up">
      <PageHeader
        title="AP & Disbursement"
        description="Three-way match (PO · IAR · invoice), disbursement vouchers with withholding, cheque register, and ADA payments."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {tab === 'invoices' && canWrite && (
              <Button onClick={() => setShowInvoice(true)}>
                <Plus className="h-4 w-4" /> Vendor invoice
              </Button>
            )}
            {tab === 'vouchers' && canWrite && (
              <Button onClick={() => setShowDv(true)}>
                <Plus className="h-4 w-4" /> Disbursement voucher
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              listControls.setPage(1)
              setTab(item.id)
            }}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium',
              tab === item.id
                ? 'bg-[var(--color-brand)] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {tab === 'invoices' && (
        <DataTable
          label="Vendor invoices"
          columns={[
            {
              key: 'invoiceNumber',
              header: 'Invoice#',
              className: 'font-mono text-xs',
              render: (r: Record<string, unknown>) =>
                rowStr(r, 'invoiceNumber') || rowStr(r, 'invoice_number') || '—',
            },
            {
              key: 'amount',
              header: 'Amount',
              render: (r: Record<string, unknown>) =>
                formatCurrency(Number(rowVal(r, 'amount') ?? 0)),
            },
            {
              key: 'invoiceDate',
              header: 'Invoice date',
              render: (r: Record<string, unknown>) => {
                const d = rowStr(r, 'invoiceDate') || rowStr(r, 'invoice_date')
                return d ? d.slice(0, 10) : '—'
              },
            },
            {
              key: 'match',
              header: 'Match',
              render: (r: Record<string, unknown>) => {
                const ms = rowStr(r, 'matchStatus') || rowStr(r, 'match_status') || 'pending'
                return <Badge variant={matchVariant(ms)}>{ms}</Badge>
              },
            },
            {
              key: 'status',
              header: 'Status',
              render: (r: Record<string, unknown>) => {
                const st = rowStr(r, 'status') || 'draft'
                return <Badge variant={statusVariant(st)}>{st}</Badge>
              },
            },
            {
              key: 'actions',
              header: 'Actions',
              className: 'text-right',
              render: (r: Record<string, unknown>) => {
                const id = rowStr(r, 'id')
                const ms = rowStr(r, 'matchStatus') || rowStr(r, 'match_status')
                const status = rowStr(r, 'status')
                const canMatch = canPost && (ms === 'pending' || ms === '')
                const canCreateDv =
                  canWrite && ms === 'matched' && status !== 'vouchered' && status !== 'paid'
                if (!canMatch && !canCreateDv) {
                  return <span className="text-xs text-slate-400">—</span>
                }
                return (
                  <div className="flex flex-wrap justify-end gap-1">
                    {canMatch ? (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => wrap(() => matchDisbursementInvoice(id))}
                      >
                        Match
                      </Button>
                    ) : null}
                    {canCreateDv ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setDvForm((f) => ({ ...f, vendorInvoiceId: id }))
                          setShowDv(true)
                        }}
                      >
                        Create DV
                      </Button>
                    ) : null}
                  </div>
                )
              },
            },
          ]}
          data={invoicesQuery.data?.data ?? []}
          keyExtractor={(r: Record<string, unknown>) => rowStr(r, 'id')}
          loading={invoicesQuery.isLoading}
          emptyTitle="No vendor invoices yet"
        />
      )}

      {tab === 'vouchers' && (
        <DataTable
          label="Disbursement vouchers"
          columns={[
            {
              key: 'dvNumber',
              header: 'DV#',
              className: 'font-mono text-xs',
              render: (r: Record<string, unknown>) =>
                rowStr(r, 'dvNumber') || rowStr(r, 'dv_number') || '—',
            },
            {
              key: 'payee',
              header: 'Payee',
              render: (r: Record<string, unknown>) =>
                rowStr(r, 'payeeName') || rowStr(r, 'payee_name') || '—',
            },
            {
              key: 'gross',
              header: 'Gross',
              render: (r: Record<string, unknown>) =>
                formatCurrency(Number(rowVal(r, 'grossAmount') ?? rowVal(r, 'gross_amount') ?? 0)),
            },
            {
              key: 'net',
              header: 'Net',
              render: (r: Record<string, unknown>) =>
                formatCurrency(Number(rowVal(r, 'netAmount') ?? rowVal(r, 'net_amount') ?? 0)),
            },
            {
              key: 'mode',
              header: 'Payment',
              render: (r: Record<string, unknown>) =>
                rowStr(r, 'paymentMode') || rowStr(r, 'payment_mode') || '—',
            },
            {
              key: 'status',
              header: 'Status',
              render: (r: Record<string, unknown>) => {
                const st = rowStr(r, 'status') || 'draft'
                return <Badge variant={statusVariant(st)}>{st}</Badge>
              },
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (r: Record<string, unknown>) => {
                const id = rowStr(r, 'id')
                const st = rowStr(r, 'status')
                const mode = rowStr(r, 'paymentMode') || rowStr(r, 'payment_mode')
                return (
                  <div className="flex flex-wrap gap-1">
                    {canPost && (st === 'draft' || st === 'pending_approval') && (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => wrap(() => approveDisbursementVoucher(id))}
                      >
                        Approve
                      </Button>
                    )}
                    {canPost && st === 'approved' && mode !== 'ada' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setChequeDvId(id)
                          setChequeForm({
                            chequeNumber: '',
                            bankAccountId: '',
                            fundId: '',
                            chequeDate: new Date().toISOString().slice(0, 10),
                          })
                        }}
                      >
                        Cheque
                      </Button>
                    )}
                    {canPost && st === 'approved' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => {
                          setAdaDvId(id)
                          setAdaForm({ bankReference: '' })
                        }}
                      >
                        ADA
                      </Button>
                    )}
                  </div>
                )
              },
            },
          ]}
          data={vouchersQuery.data?.data ?? []}
          keyExtractor={(r: Record<string, unknown>) => rowStr(r, 'id')}
          loading={vouchersQuery.isLoading}
          emptyTitle="No disbursement vouchers yet"
        />
      )}

      {tab === 'cheques' && (
        <DataTable
          label="Cheque register"
          columns={[
            {
              key: 'chequeNumber',
              header: 'Cheque#',
              className: 'font-mono text-xs',
              render: (r: Record<string, unknown>) =>
                rowStr(r, 'chequeNumber') || rowStr(r, 'cheque_number') || '—',
            },
            {
              key: 'payee',
              header: 'Payee',
              render: (r: Record<string, unknown>) =>
                rowStr(r, 'payeeName') || rowStr(r, 'payee_name') || '—',
            },
            {
              key: 'amount',
              header: 'Amount',
              render: (r: Record<string, unknown>) =>
                formatCurrency(Number(rowVal(r, 'amount') ?? 0)),
            },
            {
              key: 'date',
              header: 'Date',
              render: (r: Record<string, unknown>) => {
                const d = rowStr(r, 'chequeDate') || rowStr(r, 'cheque_date')
                return d ? d.slice(0, 10) : '—'
              },
            },
            {
              key: 'status',
              header: 'Status',
              render: (r: Record<string, unknown>) => {
                const st = rowStr(r, 'status') || 'issued'
                return <Badge variant={statusVariant(st)}>{st}</Badge>
              },
            },
          ]}
          data={chequesQuery.data?.data ?? []}
          keyExtractor={(r: Record<string, unknown>) => rowStr(r, 'id')}
          loading={chequesQuery.isLoading}
          emptyTitle="No cheques issued yet"
        />
      )}

      {canRead ? (
        <div className="rounded-xl border border-border bg-white px-4 py-3">
          <Pagination
            page={listControls.page}
            pageCount={Math.max(1, activeMeta?.lastPage ?? 1)}
            onPageChange={listControls.setPage}
            totalLabel={listTotalLabel(activeMeta, listControls.page)}
          />
        </div>
      ) : null}

      <Modal
        open={showInvoice}
        onClose={() => setShowInvoice(false)}
        title="Register vendor invoice"
      >
        <div className="space-y-3">
          <Select
            options={poOptions}
            value={invoiceForm.purchaseOrderId}
            onChange={(e) =>
              setInvoiceForm({ ...invoiceForm, purchaseOrderId: e.target.value, iarId: '' })
            }
            placeholder="Purchase order"
          />
          <Select
            options={iarOptions}
            value={invoiceForm.iarId}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, iarId: e.target.value })}
            placeholder="IAR (optional)"
          />
          <Input
            placeholder="Supplier invoice number"
            value={invoiceForm.invoiceNumber}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
          />
          <Input
            placeholder="Amount"
            value={invoiceForm.amount}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
          />
          <Input
            type="date"
            aria-label="Invoice date"
            value={invoiceForm.invoiceDate}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
          />
          <Button
            className="w-full"
            disabled={
              busy ||
              !invoiceForm.purchaseOrderId ||
              !invoiceForm.invoiceNumber ||
              !invoiceForm.amount
            }
            onClick={() =>
              wrap(async () => {
                await createDisbursementInvoice({
                  purchaseOrderId: invoiceForm.purchaseOrderId,
                  iarId: invoiceForm.iarId || undefined,
                  invoiceNumber: invoiceForm.invoiceNumber,
                  amount: Number(invoiceForm.amount),
                  invoiceDate: invoiceForm.invoiceDate || undefined,
                })
                setShowInvoice(false)
                setInvoiceForm({
                  purchaseOrderId: '',
                  iarId: '',
                  invoiceNumber: '',
                  amount: '',
                  invoiceDate: new Date().toISOString().slice(0, 10),
                })
              })
            }
          >
            {busy ? <Spinner className="h-4 w-4" /> : 'Save invoice'}
          </Button>
        </div>
      </Modal>

      <Modal open={showDv} onClose={() => setShowDv(false)} title="Create disbursement voucher">
        <div className="space-y-3">
          <Select
            options={matchedInvoiceOptions}
            value={dvForm.vendorInvoiceId}
            onChange={(e) => setDvForm({ ...dvForm, vendorInvoiceId: e.target.value })}
            placeholder="Matched vendor invoice"
          />
          <Select
            options={[
              { value: 'cheque', label: 'Cheque' },
              { value: 'ada', label: 'ADA / bank transfer' },
            ]}
            value={dvForm.paymentMode}
            onChange={(e) => setDvForm({ ...dvForm, paymentMode: e.target.value })}
          />
          <Input
            placeholder="Obligation ID (optional)"
            value={dvForm.obligationId}
            onChange={(e) => setDvForm({ ...dvForm, obligationId: e.target.value })}
          />
          <Input
            placeholder="Payee name override (optional)"
            value={dvForm.payeeName}
            onChange={(e) => setDvForm({ ...dvForm, payeeName: e.target.value })}
          />
          <Button
            className="w-full"
            disabled={busy || !dvForm.vendorInvoiceId}
            onClick={() =>
              wrap(async () => {
                await createDisbursementVoucher({
                  vendorInvoiceId: dvForm.vendorInvoiceId,
                  paymentMode: dvForm.paymentMode,
                  obligationId: dvForm.obligationId || undefined,
                  payeeName: dvForm.payeeName || undefined,
                })
                setShowDv(false)
                setDvForm({
                  vendorInvoiceId: '',
                  paymentMode: 'cheque',
                  obligationId: '',
                  payeeName: '',
                })
                setTab('vouchers')
              })
            }
          >
            {busy ? <Spinner className="h-4 w-4" /> : 'Create DV'}
          </Button>
        </div>
      </Modal>

      <Modal open={!!chequeDvId} onClose={() => setChequeDvId(null)} title="Issue cheque">
        <div className="space-y-3">
          <Input
            placeholder="Cheque number (auto if blank)"
            value={chequeForm.chequeNumber}
            onChange={(e) => setChequeForm({ ...chequeForm, chequeNumber: e.target.value })}
          />
          <Select
            options={bankOptions}
            value={chequeForm.bankAccountId}
            onChange={(e) => setChequeForm({ ...chequeForm, bankAccountId: e.target.value })}
            placeholder="Bank account"
          />
          <Select
            options={fundOptions}
            value={chequeForm.fundId}
            onChange={(e) => setChequeForm({ ...chequeForm, fundId: e.target.value })}
            placeholder="Fund"
          />
          <Input
            type="date"
            aria-label="Cheque date"
            value={chequeForm.chequeDate}
            onChange={(e) => setChequeForm({ ...chequeForm, chequeDate: e.target.value })}
          />
          <Button
            className="w-full"
            disabled={busy || !chequeDvId}
            onClick={() =>
              wrap(async () => {
                if (!chequeDvId) return
                await issueDisbursementCheque(chequeDvId, {
                  chequeNumber: chequeForm.chequeNumber || undefined,
                  bankAccountId: chequeForm.bankAccountId || undefined,
                  fundId: chequeForm.fundId || undefined,
                  chequeDate: chequeForm.chequeDate || undefined,
                })
                setChequeDvId(null)
                setTab('cheques')
              })
            }
          >
            {busy ? <Spinner className="h-4 w-4" /> : 'Issue cheque'}
          </Button>
        </div>
      </Modal>

      <Modal open={!!adaDvId} onClose={() => setAdaDvId(null)} title="Record ADA payment">
        <div className="space-y-3">
          <Input
            placeholder="Bank reference / trace number"
            value={adaForm.bankReference}
            onChange={(e) => setAdaForm({ bankReference: e.target.value })}
          />
          <Button
            className="w-full"
            disabled={busy || !adaDvId}
            onClick={() =>
              wrap(async () => {
                if (!adaDvId) return
                await recordDisbursementAda(adaDvId, {
                  bankReference: adaForm.bankReference || undefined,
                })
                setAdaDvId(null)
              })
            }
          >
            {busy ? <Spinner className="h-4 w-4" /> : 'Record ADA'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
