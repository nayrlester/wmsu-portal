import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-chrome'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatCurrency, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import {
  approveOrder,
  approveRequisition,
  createDelivery,
  createIar,
  createOrder,
  createQuotation,
  createRequisition,
  createRfq,
  createVendor,
  fetchAccounts,
  fetchFunds,
  fetchIars,
  fetchOrders,
  fetchProcurementMonitor,
  fetchRequisitions,
  fetchRfqs,
  fetchVendors,
  issueOrder,
  issueRfq,
  rejectRequisition,
  submitRequisition,
} from '../api/procurement-api'

type Tab = 'monitor' | 'vendors' | 'prs' | 'rfqs' | 'orders' | 'iars'

function hasPerm(permissions: string[], code: string) {
  return permissions.includes('*') || permissions.includes(code)
}

function statusVariant(status: string): 'success' | 'danger' | 'warning' | 'default' {
  if (['approved', 'issued', 'awarded', 'accepted', 'received'].includes(status)) return 'success'
  if (['rejected', 'cancelled'].includes(status)) return 'danger'
  if (['submitted', 'partially_received', 'pending'].includes(status)) return 'warning'
  return 'default'
}

export function ProcurementPage() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore((s) => s.user?.permissions ?? [])
  const canWrite = hasPerm(permissions, 'procurement.write')
  const canApprove = hasPerm(permissions, 'procurement.approve')
  const canAccept = hasPerm(permissions, 'procurement.accept')

  const [tab, setTab] = useState<Tab>('monitor')
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()))
  const [error, setError] = useState<string | null>(null)
  const [showVendor, setShowVendor] = useState(false)
  const [showPr, setShowPr] = useState(false)
  const [showRfq, setShowRfq] = useState(false)
  const [showQuote, setShowQuote] = useState(false)
  const [showPo, setShowPo] = useState(false)
  const [showDelivery, setShowDelivery] = useState(false)
  const [showIar, setShowIar] = useState(false)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const [vendorForm, setVendorForm] = useState({
    code: '',
    name: '',
    paymentTerms: '',
    eligibilityValidUntil: '',
  })
  const [prForm, setPrForm] = useState({
    purpose: '',
    fundId: '',
    accountId: '',
    description: '',
    quantity: '1',
    unitCost: '',
  })
  const [rfqForm, setRfqForm] = useState({
    purchaseRequisitionId: '',
    method: 'quotation',
    philgepsReference: '',
  })
  const [quoteForm, setQuoteForm] = useState({ rfqId: '', supplierId: '', amount: '' })
  const [poForm, setPoForm] = useState({ supplierId: '', description: '', amount: '' })
  const [deliveryForm, setDeliveryForm] = useState({
    purchaseOrderId: '',
    deliveredOn: new Date().toISOString().slice(0, 10),
    quantityDelivered: '1',
  })
  const [iarForm, setIarForm] = useState({
    purchaseOrderId: '',
    deliveryId: '',
    result: 'accepted',
  })

  const fundsQuery = useQuery({ queryKey: ['proc-funds'], queryFn: fetchFunds })
  const accountsQuery = useQuery({ queryKey: ['proc-accounts'], queryFn: fetchAccounts })
  const monitorQuery = useQuery({
    queryKey: ['proc-monitor'],
    queryFn: fetchProcurementMonitor,
    enabled: tab === 'monitor',
  })
  const vendorsQuery = useQuery({
    queryKey: ['proc-vendors'],
    queryFn: fetchVendors,
    enabled: tab === 'vendors' || showQuote || showPo,
  })
  const prsQuery = useQuery({
    queryKey: ['proc-prs', fiscalYear],
    queryFn: () => fetchRequisitions({ fiscalYear }),
  })
  const rfqsQuery = useQuery({
    queryKey: ['proc-rfqs'],
    queryFn: fetchRfqs,
    enabled: tab === 'rfqs' || showQuote,
  })
  const ordersQuery = useQuery({
    queryKey: ['proc-orders'],
    queryFn: fetchOrders,
    enabled: tab === 'orders' || tab === 'iars' || showDelivery || showIar,
  })
  const iarsQuery = useQuery({
    queryKey: ['proc-iars'],
    queryFn: fetchIars,
    enabled: tab === 'iars',
  })

  async function wrap(fn: () => Promise<unknown>) {
    setError(null)
    try {
      await fn()
      await queryClient.invalidateQueries({ queryKey: ['proc'] })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['proc-monitor'] }),
        queryClient.invalidateQueries({ queryKey: ['proc-vendors'] }),
        queryClient.invalidateQueries({ queryKey: ['proc-prs'] }),
        queryClient.invalidateQueries({ queryKey: ['proc-rfqs'] }),
        queryClient.invalidateQueries({ queryKey: ['proc-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['proc-iars'] }),
      ])
    } catch (err) {
      setError(getApiErrorMessage(err))
      throw err
    }
  }

  const vendorMutation = useMutation({
    mutationFn: () =>
      wrap(() =>
        createVendor({
          ...vendorForm,
          eligibilityValidUntil: vendorForm.eligibilityValidUntil || undefined,
        })
      ),
    onSuccess: () => {
      setShowVendor(false)
      setVendorForm({ code: '', name: '', paymentTerms: '', eligibilityValidUntil: '' })
    },
  })

  const prMutation = useMutation({
    mutationFn: () =>
      wrap(() =>
        createRequisition({
          fiscalYear,
          purpose: prForm.purpose,
          fundId: prForm.fundId || undefined,
          accountId: prForm.accountId || undefined,
          lines: [
            {
              description: prForm.description,
              quantity: Number(prForm.quantity),
              unitCost: Number(prForm.unitCost),
            },
          ],
        })
      ),
    onSuccess: () => {
      setShowPr(false)
      setPrForm({
        purpose: '',
        fundId: '',
        accountId: '',
        description: '',
        quantity: '1',
        unitCost: '',
      })
    },
  })

  const tabs: { id: Tab; label: string }[] = [
    { id: 'monitor', label: 'Monitor' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'prs', label: 'Purchase Requests' },
    { id: 'rfqs', label: 'RFQ / Bidding' },
    { id: 'orders', label: 'Purchase Orders' },
    { id: 'iars', label: 'IAR / Acceptance' },
  ]

  const fundOptions = useMemo(
    () =>
      (fundsQuery.data ?? []).map((f: any) => ({
        value: f.id,
        label: `${f.fundCode} — ${f.fundName}`,
      })),
    [fundsQuery.data]
  )
  const accountOptions = useMemo(
    () =>
      (accountsQuery.data ?? []).map((a: any) => ({
        value: a.id,
        label: `${a.accountCode} — ${a.accountTitle}`,
      })),
    [accountsQuery.data]
  )
  const approvedPrOptions = useMemo(
    () =>
      (prsQuery.data ?? [])
        .filter((p: any) => p.status === 'approved')
        .map((p: any) => ({ value: p.id, label: `${p.prNumber} — ${p.purpose || 'PR'}` })),
    [prsQuery.data]
  )
  const vendorOptions = useMemo(
    () =>
      (vendorsQuery.data ?? []).map((v: any) => ({ value: v.id, label: `${v.code} — ${v.name}` })),
    [vendorsQuery.data]
  )
  const issuedRfqOptions = useMemo(
    () =>
      (rfqsQuery.data ?? [])
        .filter((r: any) => r.status === 'issued')
        .map((r: any) => ({ value: r.id, label: r.rfqNumber })),
    [rfqsQuery.data]
  )
  const issuedPoOptions = useMemo(
    () =>
      (ordersQuery.data ?? [])
        .filter((o: any) => o.status === 'issued' || o.status === 'partially_received')
        .map((o: any) => ({
          value: o.id,
          label: `${o.poNumber} — ${formatCurrency(o.totalAmount)}`,
        })),
    [ordersQuery.data]
  )

  return (
    <div className="space-y-4 animate-fade-up">
      <PageHeader
        title="Procurement Management"
        description="APP-linked PR, RFQ/bidding, abstract/award, PO, delivery, and IAR with PhilGEPS refs and budget advisory checks."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-28"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              aria-label="Fiscal year"
            />
            {tab === 'vendors' && canWrite && (
              <Button onClick={() => setShowVendor(true)}>
                <Plus className="h-4 w-4" /> Vendor
              </Button>
            )}
            {tab === 'prs' && canWrite && (
              <Button onClick={() => setShowPr(true)}>
                <Plus className="h-4 w-4" /> New PR
              </Button>
            )}
            {tab === 'rfqs' && canWrite && (
              <>
                <Button variant="outline" onClick={() => setShowRfq(true)}>
                  New RFQ
                </Button>
                <Button onClick={() => setShowQuote(true)}>Quotation</Button>
              </>
            )}
            {tab === 'orders' && canWrite && (
              <>
                <Button variant="outline" onClick={() => setShowPo(true)}>
                  New PO
                </Button>
                <Button onClick={() => setShowDelivery(true)}>Delivery</Button>
              </>
            )}
            {tab === 'iars' && canAccept && (
              <Button onClick={() => setShowIar(true)}>
                <Plus className="h-4 w-4" /> Issue IAR
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
            onClick={() => setTab(item.id)}
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

      {tab === 'monitor' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['PRs', monitorQuery.data?.purchaseRequisitions],
            ['RFQs', monitorQuery.data?.rfqs],
            ['POs', monitorQuery.data?.purchaseOrders],
            ['IARs', monitorQuery.data?.iars],
            ['UIMS pending', monitorQuery.data?.pendingUimsEvents],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{value ?? '—'}</div>
            </div>
          ))}
          <p className="sm:col-span-2 lg:col-span-5 text-sm text-slate-600">
            Payment / three-way AP is deferred. Budget check on PR submit is advisory until
            hard-stop policy is clarified.
          </p>
        </div>
      )}

      {tab === 'vendors' && (
        <DataTable
          label="Vendors"
          columns={[
            {
              key: 'code',
              header: 'Code',
              className: 'font-mono text-xs',
              render: (r: any) => r.code,
            },
            { key: 'name', header: 'Name', render: (r: any) => r.name },
            { key: 'terms', header: 'Payment terms', render: (r: any) => r.paymentTerms || '—' },
            {
              key: 'elig',
              header: 'Eligibility until',
              render: (r: any) =>
                r.eligibilityValidUntil ? String(r.eligibilityValidUntil).slice(0, 10) : '—',
            },
            {
              key: 'active',
              header: 'Status',
              render: (r: any) => (
                <Badge variant={r.active ? 'success' : 'default'}>
                  {r.active ? 'Active' : 'Inactive'}
                </Badge>
              ),
            },
          ]}
          data={vendorsQuery.data ?? []}
          keyExtractor={(r: any) => r.id}
          loading={vendorsQuery.isLoading}
          emptyTitle="No vendors yet"
        />
      )}

      {tab === 'prs' && (
        <DataTable
          label="Purchase requests"
          columns={[
            {
              key: 'prNumber',
              header: 'PR#',
              className: 'font-mono text-xs',
              render: (r: any) => r.prNumber,
            },
            { key: 'purpose', header: 'Purpose', render: (r: any) => r.purpose || '—' },
            {
              key: 'amount',
              header: 'Estimate',
              render: (r: any) => formatCurrency(r.estimatedAmount ?? 0),
            },
            {
              key: 'budget',
              header: 'Budget check',
              render: (r: any) =>
                r.budgetCheckSufficient == null
                  ? '—'
                  : r.budgetCheckSufficient
                    ? 'Sufficient'
                    : 'Insufficient',
            },
            {
              key: 'status',
              header: 'Status',
              render: (r: any) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (r: any) => (
                <div className="flex flex-wrap gap-1">
                  {r.status === 'draft' && canWrite && (
                    <Button size="sm" onClick={() => wrap(() => submitRequisition(r.id))}>
                      Submit
                    </Button>
                  )}
                  {r.status === 'submitted' && canApprove && (
                    <>
                      <Button size="sm" onClick={() => wrap(() => approveRequisition(r.id))}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectId(r.id)}>
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          data={prsQuery.data ?? []}
          keyExtractor={(r: any) => r.id}
          loading={prsQuery.isLoading}
          emptyTitle="No purchase requests"
        />
      )}

      {tab === 'rfqs' && (
        <DataTable
          label="RFQ / bidding"
          columns={[
            {
              key: 'rfqNumber',
              header: 'RFQ#',
              className: 'font-mono text-xs',
              render: (r: any) => r.rfqNumber,
            },
            { key: 'method', header: 'Method', render: (r: any) => r.method },
            { key: 'philgeps', header: 'PhilGEPS', render: (r: any) => r.philgepsReference || '—' },
            {
              key: 'status',
              header: 'Status',
              render: (r: any) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (r: any) =>
                r.status === 'draft' && canWrite ? (
                  <Button size="sm" onClick={() => wrap(() => issueRfq(r.id))}>
                    Issue
                  </Button>
                ) : null,
            },
          ]}
          data={rfqsQuery.data ?? []}
          keyExtractor={(r: any) => r.id}
          loading={rfqsQuery.isLoading}
          emptyTitle="No RFQs yet"
        />
      )}

      {tab === 'orders' && (
        <DataTable
          label="Purchase orders"
          columns={[
            {
              key: 'poNumber',
              header: 'PO#',
              className: 'font-mono text-xs',
              render: (r: any) => r.poNumber,
            },
            { key: 'supplier', header: 'Supplier', render: (r: any) => r.supplierName || '—' },
            { key: 'amount', header: 'Total', render: (r: any) => formatCurrency(r.totalAmount) },
            { key: 'philgeps', header: 'PhilGEPS', render: (r: any) => r.philgepsReference || '—' },
            {
              key: 'status',
              header: 'Status',
              render: (r: any) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (r: any) => (
                <div className="flex flex-wrap gap-1">
                  {r.status === 'draft' && canApprove && (
                    <Button size="sm" onClick={() => wrap(() => approveOrder(r.id))}>
                      Approve
                    </Button>
                  )}
                  {r.status === 'approved' && canWrite && (
                    <Button size="sm" onClick={() => wrap(() => issueOrder(r.id))}>
                      Issue
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          data={ordersQuery.data ?? []}
          keyExtractor={(r: any) => r.id}
          loading={ordersQuery.isLoading}
          emptyTitle="No purchase orders"
        />
      )}

      {tab === 'iars' && (
        <DataTable
          label="Inspection and acceptance"
          columns={[
            {
              key: 'iarNumber',
              header: 'IAR#',
              className: 'font-mono text-xs',
              render: (r: any) => r.iarNumber,
            },
            { key: 'result', header: 'Result', render: (r: any) => r.result },
            {
              key: 'uims',
              header: 'UIMS sync',
              render: (r: any) => (
                <Badge variant={statusVariant(r.uimsSyncStatus)}>{r.uimsSyncStatus}</Badge>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r: any) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
            },
          ]}
          data={iarsQuery.data ?? []}
          keyExtractor={(r: any) => r.id}
          loading={iarsQuery.isLoading}
          emptyTitle="No IARs yet"
        />
      )}

      <Modal open={showVendor} onClose={() => setShowVendor(false)} title="Register vendor">
        <div className="space-y-3">
          <Input
            placeholder="Code"
            value={vendorForm.code}
            onChange={(e) => setVendorForm({ ...vendorForm, code: e.target.value })}
          />
          <Input
            placeholder="Name"
            value={vendorForm.name}
            onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
          />
          <Input
            placeholder="Payment terms"
            value={vendorForm.paymentTerms}
            onChange={(e) => setVendorForm({ ...vendorForm, paymentTerms: e.target.value })}
          />
          <Input
            type="date"
            aria-label="Eligibility valid until"
            value={vendorForm.eligibilityValidUntil}
            onChange={(e) =>
              setVendorForm({ ...vendorForm, eligibilityValidUntil: e.target.value })
            }
          />
          <Button
            className="w-full"
            onClick={() => vendorMutation.mutate()}
            disabled={vendorMutation.isPending}
          >
            Save vendor
          </Button>
        </div>
      </Modal>

      <Modal open={showPr} onClose={() => setShowPr(false)} title="New purchase request">
        <div className="space-y-3">
          <Input
            placeholder="Purpose"
            value={prForm.purpose}
            onChange={(e) => setPrForm({ ...prForm, purpose: e.target.value })}
          />
          <Select
            options={fundOptions}
            value={prForm.fundId}
            onChange={(e) => setPrForm({ ...prForm, fundId: e.target.value })}
            placeholder="Fund"
          />
          <Select
            options={accountOptions}
            value={prForm.accountId}
            onChange={(e) => setPrForm({ ...prForm, accountId: e.target.value })}
            placeholder="Account"
          />
          <Input
            placeholder="Item / service description"
            value={prForm.description}
            onChange={(e) => setPrForm({ ...prForm, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Qty"
              value={prForm.quantity}
              onChange={(e) => setPrForm({ ...prForm, quantity: e.target.value })}
            />
            <Input
              placeholder="Unit cost"
              value={prForm.unitCost}
              onChange={(e) => setPrForm({ ...prForm, unitCost: e.target.value })}
            />
          </div>
          <Button
            className="w-full"
            onClick={() => prMutation.mutate()}
            disabled={prMutation.isPending}
          >
            Create PR
          </Button>
        </div>
      </Modal>

      <Modal open={showRfq} onClose={() => setShowRfq(false)} title="Create RFQ / bidding record">
        <div className="space-y-3">
          <Select
            options={approvedPrOptions}
            value={rfqForm.purchaseRequisitionId}
            onChange={(e) => setRfqForm({ ...rfqForm, purchaseRequisitionId: e.target.value })}
            placeholder="Approved PR"
          />
          <Select
            options={[
              { value: 'quotation', label: 'Request for quotation' },
              { value: 'bidding', label: 'Bidding' },
            ]}
            value={rfqForm.method}
            onChange={(e) => setRfqForm({ ...rfqForm, method: e.target.value })}
          />
          <Input
            placeholder="PhilGEPS reference"
            value={rfqForm.philgepsReference}
            onChange={(e) => setRfqForm({ ...rfqForm, philgepsReference: e.target.value })}
          />
          <Button
            className="w-full"
            onClick={() =>
              wrap(async () => {
                await createRfq(rfqForm)
                setShowRfq(false)
              })
            }
          >
            Create RFQ
          </Button>
        </div>
      </Modal>

      <Modal open={showQuote} onClose={() => setShowQuote(false)} title="Record quotation">
        <div className="space-y-3">
          <Select
            options={issuedRfqOptions}
            value={quoteForm.rfqId}
            onChange={(e) => setQuoteForm({ ...quoteForm, rfqId: e.target.value })}
            placeholder="Issued RFQ"
          />
          <Select
            options={vendorOptions}
            value={quoteForm.supplierId}
            onChange={(e) => setQuoteForm({ ...quoteForm, supplierId: e.target.value })}
            placeholder="Vendor"
          />
          <Input
            placeholder="Amount"
            value={quoteForm.amount}
            onChange={(e) => setQuoteForm({ ...quoteForm, amount: e.target.value })}
          />
          <Button
            className="w-full"
            onClick={() =>
              wrap(async () => {
                await createQuotation({ ...quoteForm, amount: Number(quoteForm.amount) })
                setShowQuote(false)
              })
            }
          >
            Save quotation
          </Button>
        </div>
      </Modal>

      <Modal open={showPo} onClose={() => setShowPo(false)} title="Create purchase order">
        <div className="space-y-3">
          <Select
            options={vendorOptions}
            value={poForm.supplierId}
            onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
            placeholder="Vendor"
          />
          <Input
            placeholder="Description"
            value={poForm.description}
            onChange={(e) => setPoForm({ ...poForm, description: e.target.value })}
          />
          <Input
            placeholder="Total amount"
            value={poForm.amount}
            onChange={(e) => setPoForm({ ...poForm, amount: e.target.value })}
          />
          <Button
            className="w-full"
            onClick={() =>
              wrap(async () => {
                await createOrder({
                  supplierId: poForm.supplierId,
                  totalAmount: Number(poForm.amount),
                  description: poForm.description,
                  lines: [
                    {
                      description: poForm.description || 'PO line',
                      quantity: 1,
                      unitCost: Number(poForm.amount),
                    },
                  ],
                })
                setShowPo(false)
              })
            }
          >
            Create PO
          </Button>
        </div>
      </Modal>

      <Modal open={showDelivery} onClose={() => setShowDelivery(false)} title="Record delivery">
        <div className="space-y-3">
          <Select
            options={issuedPoOptions}
            value={deliveryForm.purchaseOrderId}
            onChange={(e) => setDeliveryForm({ ...deliveryForm, purchaseOrderId: e.target.value })}
            placeholder="Issued PO"
          />
          <Input
            type="date"
            value={deliveryForm.deliveredOn}
            onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveredOn: e.target.value })}
          />
          <Input
            placeholder="Quantity delivered"
            value={deliveryForm.quantityDelivered}
            onChange={(e) =>
              setDeliveryForm({ ...deliveryForm, quantityDelivered: e.target.value })
            }
          />
          <Button
            className="w-full"
            onClick={() =>
              wrap(async () => {
                await createDelivery({
                  purchaseOrderId: deliveryForm.purchaseOrderId,
                  deliveredOn: deliveryForm.deliveredOn,
                  lines: [{ quantityDelivered: Number(deliveryForm.quantityDelivered) }],
                })
                setShowDelivery(false)
              })
            }
          >
            Save delivery
          </Button>
        </div>
      </Modal>

      <Modal open={showIar} onClose={() => setShowIar(false)} title="Issue IAR">
        <div className="space-y-3">
          <Select
            options={issuedPoOptions}
            value={iarForm.purchaseOrderId}
            onChange={(e) => setIarForm({ ...iarForm, purchaseOrderId: e.target.value })}
            placeholder="PO"
          />
          <Input
            placeholder="Delivery ID"
            value={iarForm.deliveryId}
            onChange={(e) => setIarForm({ ...iarForm, deliveryId: e.target.value })}
          />
          <Select
            options={[
              { value: 'accepted', label: 'Accepted' },
              { value: 'partial', label: 'Partial' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            value={iarForm.result}
            onChange={(e) => setIarForm({ ...iarForm, result: e.target.value })}
          />
          <Button
            className="w-full"
            onClick={() =>
              wrap(async () => {
                await createIar(iarForm)
                setShowIar(false)
              })
            }
          >
            Issue IAR
          </Button>
        </div>
      </Modal>

      <Modal open={!!rejectId} onClose={() => setRejectId(null)} title="Reject purchase request">
        <div className="space-y-3">
          <Input
            placeholder="Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <Button
            className="w-full"
            onClick={() =>
              wrap(async () => {
                if (!rejectId) return
                await rejectRequisition(rejectId, rejectReason)
                setRejectId(null)
                setRejectReason('')
              })
            }
          >
            Reject
          </Button>
        </div>
      </Modal>
    </div>
  )
}
