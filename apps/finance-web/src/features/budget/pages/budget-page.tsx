import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { PageHeader } from '@/components/ui/page-chrome'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatCurrency, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import {
  approveBudgetDocument,
  approveBudgetPlan,
  createBudgetDocument,
  createBudgetObligation,
  createBudgetPlan,
  fetchAccounts,
  fetchBudgetDocuments,
  fetchBudgetMonitor,
  fetchBudgetObligations,
  fetchBudgetPlans,
  fetchFunds,
  postBudgetObligation,
  rejectBudgetDocument,
  rejectBudgetPlan,
  submitBudgetDocument,
  submitBudgetPlan,
} from '../api/budget-api'
import type { Column } from '@/components/ui/data-table'

type Tab = 'plans' | 'documents' | 'obligations' | 'monitor'

function statusVariant(status: string): 'success' | 'danger' | 'warning' | 'default' {
  if (status === 'approved' || status === 'posted') return 'success'
  if (status === 'rejected' || status === 'cancelled') return 'danger'
  if (status === 'submitted') return 'warning'
  return 'default'
}

function hasPerm(permissions: string[], code: string) {
  return permissions.includes('*') || permissions.includes(code)
}

export function BudgetPage() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore((s) => s.user?.permissions ?? [])
  const canWrite = hasPerm(permissions, 'budget.write')
  const canSubmit = hasPerm(permissions, 'budget.submit')
  const canApprove = hasPerm(permissions, 'budget.approve')

  const [tab, setTab] = useState<Tab>('plans')
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()))
  const [error, setError] = useState<string | null>(null)
  const [showPlan, setShowPlan] = useState(false)
  const [showDoc, setShowDoc] = useState(false)
  const [showObl, setShowObl] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<{ kind: 'plan' | 'doc'; id: string } | null>(
    null
  )
  const [rejectReason, setRejectReason] = useState('')

  const [planForm, setPlanForm] = useState({
    planType: 'wfp',
    title: '',
    description: '',
    lineDescription: '',
    fundId: '',
    accountId: '',
    amount: '',
  })
  const [docForm, setDocForm] = useState({
    documentType: 'annual',
    title: '',
    fundId: '',
    accountId: '',
    amount: '',
    effect: 'increase',
  })
  const [oblForm, setOblForm] = useState({
    documentKind: 'ors',
    documentNumber: '',
    fundId: '',
    accountId: '',
    amount: '',
    particulars: '',
  })

  const fundsQuery = useQuery({ queryKey: ['budget-funds'], queryFn: fetchFunds })
  const accountsQuery = useQuery({ queryKey: ['budget-accounts'], queryFn: fetchAccounts })
  const plansQuery = useQuery({
    queryKey: ['budget-plans', fiscalYear],
    queryFn: () => fetchBudgetPlans({ fiscalYear }),
  })
  const docsQuery = useQuery({
    queryKey: ['budget-documents', fiscalYear],
    queryFn: () => fetchBudgetDocuments({ fiscalYear }),
  })
  const oblQuery = useQuery({
    queryKey: ['budget-obligations', fiscalYear],
    queryFn: () => fetchBudgetObligations({ fiscalYear }),
  })
  const monitorQuery = useQuery({
    queryKey: ['budget-monitor', fiscalYear],
    queryFn: () => fetchBudgetMonitor(fiscalYear),
    enabled: tab === 'monitor',
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['budget-plans'] })
    queryClient.invalidateQueries({ queryKey: ['budget-documents'] })
    queryClient.invalidateQueries({ queryKey: ['budget-obligations'] })
    queryClient.invalidateQueries({ queryKey: ['budget-monitor'] })
  }

  const wrap = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
      invalidate()
    } catch (err) {
      setError(getApiErrorMessage(err))
      throw err
    }
  }

  const createPlanMut = useMutation({
    mutationFn: () =>
      wrap(() =>
        createBudgetPlan({
          planType: planForm.planType,
          fiscalYear,
          title: planForm.title,
          description: planForm.description || null,
          lines: planForm.lineDescription
            ? [
                {
                  description: planForm.lineDescription,
                  fundId: planForm.fundId || null,
                  accountId: planForm.accountId || null,
                  amount: Number(planForm.amount || 0),
                },
              ]
            : [],
        })
      ),
    onSuccess: () => setShowPlan(false),
  })

  const createDocMut = useMutation({
    mutationFn: () =>
      wrap(() =>
        createBudgetDocument({
          documentType: docForm.documentType,
          fiscalYear,
          title: docForm.title,
          lines: [
            {
              fundId: docForm.fundId,
              accountId: docForm.accountId,
              amount: Number(docForm.amount),
              effect: docForm.effect,
            },
          ],
        })
      ),
    onSuccess: () => setShowDoc(false),
  })

  const createOblMut = useMutation({
    mutationFn: () =>
      wrap(() =>
        createBudgetObligation({
          documentKind: oblForm.documentKind,
          documentNumber: oblForm.documentNumber,
          fiscalYear,
          fundId: oblForm.fundId,
          accountId: oblForm.accountId,
          amount: Number(oblForm.amount),
          particulars: oblForm.particulars || null,
        })
      ),
    onSuccess: () => setShowObl(false),
  })

  const fundOptions = fundsQuery.data ?? []
  const accountOptions = accountsQuery.data ?? []

  const planColumns = useMemo<
    Column<typeof plansQuery.data extends (infer T)[] | undefined ? T : never>[]
  >(
    () => [
      { key: 'planType', header: 'Type', render: (r) => r.planType.toUpperCase() },
      {
        key: 'title',
        header: 'Title',
        render: (r) => <span className="font-medium">{r.title}</span>,
      },
      { key: 'fiscalYear', header: 'FY' },
      {
        key: 'status',
        header: 'Status',
        render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (r) => (
          <div className="flex flex-wrap gap-1">
            {r.status === 'draft' && canSubmit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => wrap(() => submitBudgetPlan(r.id))}
              >
                Submit
              </Button>
            )}
            {r.status === 'submitted' && canApprove && (
              <>
                <Button size="sm" onClick={() => wrap(() => approveBudgetPlan(r.id))}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectTarget({ kind: 'plan', id: r.id })}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [canApprove, canSubmit]
  )

  const docColumns = useMemo(
    () => [
      { key: 'documentType', header: 'Type', render: (r: any) => r.documentType },
      {
        key: 'title',
        header: 'Title',
        render: (r: any) => <span className="font-medium">{r.title}</span>,
      },
      { key: 'fiscalYear', header: 'FY' },
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
            {r.status === 'draft' && canSubmit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => wrap(() => submitBudgetDocument(r.id))}
              >
                Submit
              </Button>
            )}
            {r.status === 'submitted' && canApprove && (
              <>
                <Button size="sm" onClick={() => wrap(() => approveBudgetDocument(r.id))}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectTarget({ kind: 'doc', id: r.id })}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [canApprove, canSubmit]
  )

  const oblColumns = useMemo(
    () => [
      { key: 'documentKind', header: 'Kind', render: (r: any) => r.documentKind.toUpperCase() },
      { key: 'documentNumber', header: 'Number', className: 'font-mono text-xs' },
      {
        key: 'amount',
        header: 'Amount',
        className: 'text-right',
        render: (r: any) => formatCurrency(r.amount),
      },
      {
        key: 'status',
        header: 'Status',
        render: (r: any) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (r: any) =>
          r.status === 'draft' && canApprove ? (
            <Button size="sm" onClick={() => wrap(() => postBudgetObligation(r.id))}>
              Post
            </Button>
          ) : null,
      },
    ],
    [canApprove]
  )

  const monitorColumns = useMemo(
    () => [
      { key: 'fundCode', header: 'Fund', render: (r: any) => r.fundCode ?? '—' },
      { key: 'accountCode', header: 'Account', render: (r: any) => r.accountCode ?? '—' },
      { key: 'uacsCode', header: 'UACS', render: (r: any) => r.uacsCode ?? '—' },
      {
        key: 'allocatedAmount',
        header: 'Allocated',
        className: 'text-right',
        render: (r: any) => formatCurrency(r.allocatedAmount),
      },
      {
        key: 'obligatedAmount',
        header: 'Obligated',
        className: 'text-right',
        render: (r: any) => formatCurrency(r.obligatedAmount),
      },
      {
        key: 'availableAmount',
        header: 'Available',
        className: 'text-right',
        render: (r: any) => formatCurrency(r.availableAmount),
      },
    ],
    []
  )

  const tabs: { id: Tab; label: string }[] = [
    { id: 'plans', label: 'APP / WFP' },
    { id: 'documents', label: 'Allocations' },
    { id: 'obligations', label: 'ORS / BURS' },
    { id: 'monitor', label: 'Monitoring' },
  ]

  return (
    <div className="space-y-4 animate-fade-up">
      <PageHeader
        title="Budget Management"
        description="APP/WFP preparation, budget encoding, allotment obligations, and utilization monitoring."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-28"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              aria-label="Fiscal year"
            />
            {tab === 'plans' && canWrite && (
              <Button onClick={() => setShowPlan(true)}>
                <Plus className="h-4 w-4" /> New plan
              </Button>
            )}
            {tab === 'documents' && canWrite && (
              <Button onClick={() => setShowDoc(true)}>
                <Plus className="h-4 w-4" /> New allocation
              </Button>
            )}
            {tab === 'obligations' && canWrite && (
              <Button onClick={() => setShowObl(true)}>
                <Plus className="h-4 w-4" /> New obligation
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

      {tab === 'plans' && (
        <DataTable
          label="APP and WFP plans"
          columns={planColumns as any}
          data={plansQuery.data ?? []}
          keyExtractor={(r: any) => r.id}
          loading={plansQuery.isLoading}
          emptyTitle="No APP/WFP plans yet"
        />
      )}

      {tab === 'documents' && (
        <DataTable
          label="Budget documents"
          columns={docColumns as any}
          data={docsQuery.data ?? []}
          keyExtractor={(r: any) => r.id}
          loading={docsQuery.isLoading}
          emptyTitle="No budget documents yet"
        />
      )}

      {tab === 'obligations' && (
        <DataTable
          label="Budget obligations"
          columns={oblColumns as any}
          data={oblQuery.data ?? []}
          keyExtractor={(r: any) => r.id}
          loading={oblQuery.isLoading}
          emptyTitle="No ORS/BURS obligations yet"
        />
      )}

      {tab === 'monitor' &&
        (monitorQuery.isLoading ? (
          <Spinner />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Available = allocated − (obligated + utilized). Source: `budget_lines`. TOR:.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Allocated', monitorQuery.data?.totals.allocatedAmount],
                ['Obligated', monitorQuery.data?.totals.obligatedAmount],
                ['Utilized', monitorQuery.data?.totals.utilizedAmount],
                ['Available', monitorQuery.data?.totals.availableAmount],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 text-lg font-semibold">{formatCurrency(value as string)}</p>
                </div>
              ))}
            </div>
            <DataTable
              label="Budget monitoring"
              columns={monitorColumns as any}
              data={monitorQuery.data?.lines ?? []}
              keyExtractor={(r: any) => r.id}
              emptyTitle="No approved allocations for this fiscal year"
            />
          </div>
        ))}

      <Modal open={showPlan} onClose={() => setShowPlan(false)} title="Create APP / WFP">
        <div className="space-y-3">
          <Select
            label="Plan type"
            value={planForm.planType}
            onChange={(e) => setPlanForm((s) => ({ ...s, planType: e.target.value }))}
            options={[
              { value: 'app', label: 'APP' },
              { value: 'wfp', label: 'WFP' },
            ]}
          />
          <Input
            placeholder="Title"
            value={planForm.title}
            onChange={(e) => setPlanForm((s) => ({ ...s, title: e.target.value }))}
          />
          <Input
            placeholder="Line description"
            value={planForm.lineDescription}
            onChange={(e) => setPlanForm((s) => ({ ...s, lineDescription: e.target.value }))}
          />
          <Select
            label="Fund"
            placeholder="Fund (optional)"
            value={planForm.fundId}
            onChange={(e) => setPlanForm((s) => ({ ...s, fundId: e.target.value }))}
            options={fundOptions.map((f) => ({
              value: f.id,
              label: `${f.fundCode} — ${f.fundName}`,
            }))}
          />
          <Select
            label="Account"
            placeholder="Account (optional)"
            value={planForm.accountId}
            onChange={(e) => setPlanForm((s) => ({ ...s, accountId: e.target.value }))}
            options={accountOptions.map((a) => ({
              value: a.id,
              label: `${a.accountCode} — ${a.accountTitle}`,
            }))}
          />
          <Input
            placeholder="Amount"
            value={planForm.amount}
            onChange={(e) => setPlanForm((s) => ({ ...s, amount: e.target.value }))}
          />
          <Button
            disabled={!planForm.title || createPlanMut.isPending}
            onClick={() => createPlanMut.mutate()}
          >
            Save draft
          </Button>
        </div>
      </Modal>

      <Modal open={showDoc} onClose={() => setShowDoc(false)} title="Create budget allocation">
        <div className="space-y-3">
          <Select
            label="Document type"
            value={docForm.documentType}
            onChange={(e) => setDocForm((s) => ({ ...s, documentType: e.target.value }))}
            options={[
              { value: 'annual', label: 'Annual' },
              { value: 'supplemental', label: 'Supplemental' },
              { value: 'realignment', label: 'Realignment' },
              { value: 'adjustment', label: 'Adjustment' },
            ]}
          />
          <Input
            placeholder="Title"
            value={docForm.title}
            onChange={(e) => setDocForm((s) => ({ ...s, title: e.target.value }))}
          />
          <Select
            label="Fund"
            placeholder="Fund"
            value={docForm.fundId}
            onChange={(e) => setDocForm((s) => ({ ...s, fundId: e.target.value }))}
            options={fundOptions.map((f) => ({
              value: f.id,
              label: `${f.fundCode} — ${f.fundName}`,
            }))}
          />
          <Select
            label="Account / UACS"
            placeholder="Account / UACS"
            value={docForm.accountId}
            onChange={(e) => setDocForm((s) => ({ ...s, accountId: e.target.value }))}
            options={accountOptions.map((a) => ({
              value: a.id,
              label: `${a.accountCode} — ${a.accountTitle}`,
            }))}
          />
          <Select
            label="Effect"
            value={docForm.effect}
            onChange={(e) => setDocForm((s) => ({ ...s, effect: e.target.value }))}
            options={[
              { value: 'increase', label: 'Increase' },
              { value: 'decrease', label: 'Decrease' },
            ]}
          />
          <Input
            placeholder="Amount"
            value={docForm.amount}
            onChange={(e) => setDocForm((s) => ({ ...s, amount: e.target.value }))}
          />
          <Button
            disabled={
              !docForm.title || !docForm.fundId || !docForm.accountId || createDocMut.isPending
            }
            onClick={() => createDocMut.mutate()}
          >
            Save draft
          </Button>
        </div>
      </Modal>

      <Modal open={showObl} onClose={() => setShowObl(false)} title="Create ORS / BURS">
        <div className="space-y-3">
          <Select
            label="Document kind"
            value={oblForm.documentKind}
            onChange={(e) => setOblForm((s) => ({ ...s, documentKind: e.target.value }))}
            options={[
              { value: 'ors', label: 'ORS' },
              { value: 'burs', label: 'BURS' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <Input
            placeholder="Document number"
            value={oblForm.documentNumber}
            onChange={(e) => setOblForm((s) => ({ ...s, documentNumber: e.target.value }))}
          />
          <Select
            label="Fund"
            placeholder="Fund"
            value={oblForm.fundId}
            onChange={(e) => setOblForm((s) => ({ ...s, fundId: e.target.value }))}
            options={fundOptions.map((f) => ({
              value: f.id,
              label: `${f.fundCode} — ${f.fundName}`,
            }))}
          />
          <Select
            label="Account"
            placeholder="Account"
            value={oblForm.accountId}
            onChange={(e) => setOblForm((s) => ({ ...s, accountId: e.target.value }))}
            options={accountOptions.map((a) => ({
              value: a.id,
              label: `${a.accountCode} — ${a.accountTitle}`,
            }))}
          />
          <Input
            placeholder="Amount"
            value={oblForm.amount}
            onChange={(e) => setOblForm((s) => ({ ...s, amount: e.target.value }))}
          />
          <Input
            placeholder="Particulars"
            value={oblForm.particulars}
            onChange={(e) => setOblForm((s) => ({ ...s, particulars: e.target.value }))}
          />
          <Button
            disabled={
              !oblForm.documentNumber ||
              !oblForm.fundId ||
              !oblForm.accountId ||
              createOblMut.isPending
            }
            onClick={() => createOblMut.mutate()}
          >
            Save draft
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject budget record"
      >
        <div className="space-y-3">
          <Input
            placeholder="Rejection reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <Button
            disabled={!rejectReason}
            onClick={async () => {
              if (!rejectTarget) return
              await wrap(async () => {
                if (rejectTarget.kind === 'plan') {
                  await rejectBudgetPlan(rejectTarget.id, rejectReason)
                } else {
                  await rejectBudgetDocument(rejectTarget.id, rejectReason)
                }
              })
              setRejectTarget(null)
              setRejectReason('')
            }}
          >
            Confirm reject
          </Button>
        </div>
      </Modal>
    </div>
  )
}
