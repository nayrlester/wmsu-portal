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
  createJournal,
  createReconciliation,
  createTaxEntry,
  createTaxRate,
  fetchAccounts,
  fetchBankAccounts,
  fetchCashFlow,
  fetchFunds,
  fetchJournals,
  fetchLedger,
  fetchReconciliations,
  fetchRemittance,
  fetchTaxRates,
  fetchTrialBalance,
  postJournal,
} from '../api/accounting-api'

type Tab = 'journals' | 'ledger' | 'trial' | 'tax' | 'bank'

function hasPerm(permissions: string[], code: string) {
  return permissions.includes('*') || permissions.includes(code)
}

function statusVariant(status: string): 'success' | 'danger' | 'warning' | 'default' {
  if (status === 'posted' || status === 'completed' || status === 'remitted') return 'success'
  if (status === 'submitted' || status === 'pending' || status === 'open') return 'warning'
  return 'default'
}

export function AccountingPage() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore((s) => s.user?.permissions ?? [])
  const canWrite = hasPerm(permissions, 'accounting.write')
  const canPost = hasPerm(permissions, 'accounting.post')

  const [tab, setTab] = useState<Tab>('journals')
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()))
  const [error, setError] = useState<string | null>(null)
  const [showJournal, setShowJournal] = useState(false)
  const [showTaxRate, setShowTaxRate] = useState(false)
  const [showTaxEntry, setShowTaxEntry] = useState(false)
  const [showRecon, setShowRecon] = useState(false)

  const [journalForm, setJournalForm] = useState({
    entryType: 'jev',
    description: '',
    fundId: '',
    debitAccountId: '',
    creditAccountId: '',
    amount: '',
  })
  const [taxRateForm, setTaxRateForm] = useState({ rateCode: '', description: '', ratePercent: '' })
  const [taxEntryForm, setTaxEntryForm] = useState({
    rateId: '',
    payeeName: '',
    grossAmount: '',
    transactionDate: new Date().toISOString().slice(0, 10),
  })
  const [reconForm, setReconForm] = useState({
    bankAccountId: '',
    statementDate: new Date().toISOString().slice(0, 10),
    statementBalance: '',
    bookBalance: '',
  })

  const fundsQuery = useQuery({ queryKey: ['acct-funds'], queryFn: fetchFunds })
  const accountsQuery = useQuery({ queryKey: ['acct-accounts'], queryFn: fetchAccounts })
  const banksQuery = useQuery({ queryKey: ['acct-banks'], queryFn: fetchBankAccounts })
  const journalsQuery = useQuery({
    queryKey: ['acct-journals', fiscalYear],
    queryFn: () => fetchJournals({ fiscalYear }),
  })
  const ledgerQuery = useQuery({
    queryKey: ['acct-ledger', fiscalYear],
    queryFn: () => fetchLedger({ fiscalYear }),
    enabled: tab === 'ledger',
  })
  const trialQuery = useQuery({
    queryKey: ['acct-trial', fiscalYear],
    queryFn: () => fetchTrialBalance(fiscalYear),
    enabled: tab === 'trial',
  })
  const cashQuery = useQuery({
    queryKey: ['acct-cash', fiscalYear],
    queryFn: () => fetchCashFlow(fiscalYear),
    enabled: tab === 'trial',
  })
  const taxRatesQuery = useQuery({
    queryKey: ['acct-tax-rates'],
    queryFn: fetchTaxRates,
    enabled: tab === 'tax',
  })
  const remittanceQuery = useQuery({
    queryKey: ['acct-remittance'],
    queryFn: fetchRemittance,
    enabled: tab === 'tax',
  })
  const reconQuery = useQuery({
    queryKey: ['acct-recon'],
    queryFn: fetchReconciliations,
    enabled: tab === 'bank',
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['acct-journals'] })
    queryClient.invalidateQueries({ queryKey: ['acct-ledger'] })
    queryClient.invalidateQueries({ queryKey: ['acct-trial'] })
    queryClient.invalidateQueries({ queryKey: ['acct-cash'] })
    queryClient.invalidateQueries({ queryKey: ['acct-tax-rates'] })
    queryClient.invalidateQueries({ queryKey: ['acct-remittance'] })
    queryClient.invalidateQueries({ queryKey: ['acct-recon'] })
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

  const createJournalMut = useMutation({
    mutationFn: () =>
      wrap(() =>
        createJournal({
          entryType: journalForm.entryType,
          fiscalYear,
          entryDate: new Date().toISOString().slice(0, 10),
          description: journalForm.description,
          lines: [
            {
              fundId: journalForm.fundId,
              accountId: journalForm.debitAccountId,
              debitAmount: Number(journalForm.amount),
              creditAmount: 0,
            },
            {
              fundId: journalForm.fundId,
              accountId: journalForm.creditAccountId,
              debitAmount: 0,
              creditAmount: Number(journalForm.amount),
            },
          ],
        })
      ),
    onSuccess: () => setShowJournal(false),
  })

  const funds = fundsQuery.data ?? []
  const accounts = accountsQuery.data ?? []
  const bankAccounts = banksQuery.data ?? []

  const journalColumns = useMemo(
    () => [
      { key: 'entryNumber', header: 'Number', className: 'font-mono text-xs', render: (r: any) => r.entryNumber },
      { key: 'entryType', header: 'Type', render: (r: any) => r.entryType },
      { key: 'description', header: 'Description', render: (r: any) => r.description },
      {
        key: 'status',
        header: 'Status',
        render: (r: any) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (r: any) =>
          r.status !== 'posted' && canPost ? (
            <Button size="sm" onClick={() => wrap(() => postJournal(r.id))}>
              Post
            </Button>
          ) : null,
      },
    ],
    [canPost]
  )

  const tabs: { id: Tab; label: string }[] = [
    { id: 'journals', label: 'Journals / JEV' },
    { id: 'ledger', label: 'General Ledger' },
    { id: 'trial', label: 'Trial Balance' },
    { id: 'tax', label: 'Withholding' },
    { id: 'bank', label: 'Bank Recon' },
  ]

  return (
    <div className="space-y-4 animate-fade-up">
      <PageHeader
        title="Accounting Management"
        description="Chart-backed journals, GL inquiry, trial balance, withholding, and bank reconciliation (FIN-006/007/009/011/022/023)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-28"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              aria-label="Fiscal year"
            />
            {tab === 'journals' && canWrite && (
              <Button onClick={() => setShowJournal(true)}>
                <Plus className="h-4 w-4" /> New journal
              </Button>
            )}
            {tab === 'tax' && canWrite && (
              <>
                <Button variant="outline" onClick={() => setShowTaxRate(true)}>
                  Add rate
                </Button>
                <Button onClick={() => setShowTaxEntry(true)}>
                  <Plus className="h-4 w-4" /> Withholding
                </Button>
              </>
            )}
            {tab === 'bank' && canWrite && (
              <Button onClick={() => setShowRecon(true)}>
                <Plus className="h-4 w-4" /> Reconciliation
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
              tab === item.id ? 'bg-[var(--color-brand)] text-white' : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {tab === 'journals' && (
        <DataTable
          label="Journals"
          columns={journalColumns as any}
          data={journalsQuery.data ?? []}
          keyExtractor={(r: any) => r.id}
          loading={journalsQuery.isLoading}
          emptyTitle="No journal entries yet"
        />
      )}

      {tab === 'ledger' && (
        <DataTable
          label="General ledger"
          columns={[
            { key: 'entryNumber', header: 'JE#', className: 'font-mono text-xs', render: (r: any) => r.entryNumber },
            { key: 'entryDate', header: 'Date', render: (r: any) => String(r.entryDate).slice(0, 10) },
            {
              key: 'account',
              header: 'Account',
              render: (r: any) => r.account?.accountCode ?? r.accountId,
            },
            {
              key: 'debitAmount',
              header: 'Debit',
              className: 'text-right',
              render: (r: any) => formatCurrency(r.debitAmount),
            },
            {
              key: 'creditAmount',
              header: 'Credit',
              className: 'text-right',
              render: (r: any) => formatCurrency(r.creditAmount),
            },
          ]}
          data={ledgerQuery.data ?? []}
          keyExtractor={(r: any) => r.id}
          loading={ledgerQuery.isLoading}
          emptyTitle="No posted ledger rows"
        />
      )}

      {tab === 'trial' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Trial balance from posted `general_ledger_entries`. Cash monitor uses account types containing
            cash/bank (FIN-006, FIN-009).
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-4">
              <p className="text-xs uppercase text-slate-500">Debits</p>
              <p className="text-lg font-semibold">{formatCurrency(trialQuery.data?.totals?.debitTotal)}</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <p className="text-xs uppercase text-slate-500">Credits</p>
              <p className="text-lg font-semibold">{formatCurrency(trialQuery.data?.totals?.creditTotal)}</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <p className="text-xs uppercase text-slate-500">Cash net</p>
              <p className="text-lg font-semibold">{formatCurrency(cashQuery.data?.net)}</p>
            </div>
          </div>
          <DataTable
            label="Trial balance"
            columns={[
              { key: 'fundCode', header: 'Fund', render: (r: any) => r.fundCode ?? '—' },
              { key: 'accountCode', header: 'Account', render: (r: any) => r.accountCode ?? '—' },
              {
                key: 'debitTotal',
                header: 'Debit',
                className: 'text-right',
                render: (r: any) => formatCurrency(r.debitTotal),
              },
              {
                key: 'creditTotal',
                header: 'Credit',
                className: 'text-right',
                render: (r: any) => formatCurrency(r.creditTotal),
              },
            ]}
            data={trialQuery.data?.lines ?? []}
            keyExtractor={(r: any) => `${r.fundId}-${r.accountId}`}
            loading={trialQuery.isLoading}
            emptyTitle="No posted balances"
          />
        </div>
      )}

      {tab === 'tax' && (
        <div className="space-y-4">
          <DataTable
            label="Tax rates"
            columns={[
              { key: 'rateCode', header: 'Code', render: (r: any) => r.rateCode },
              { key: 'description', header: 'Description', render: (r: any) => r.description },
              { key: 'ratePercent', header: 'Rate %', render: (r: any) => r.ratePercent },
            ]}
            data={taxRatesQuery.data ?? []}
            keyExtractor={(r: any) => r.id}
            loading={taxRatesQuery.isLoading}
            emptyTitle="No configured withholding rates"
          />
          <p className="text-sm text-slate-500">
            Remittance total: {formatCurrency(remittanceQuery.data?.totalTax)} — BIR form variants For
            Clarification (FIN-011).
          </p>
          <DataTable
            label="Withholding entries"
            columns={[
              { key: 'payeeName', header: 'Payee', render: (r: any) => r.payeeName },
              {
                key: 'grossAmount',
                header: 'Gross',
                className: 'text-right',
                render: (r: any) => formatCurrency(r.grossAmount),
              },
              {
                key: 'taxAmount',
                header: 'Tax',
                className: 'text-right',
                render: (r: any) => formatCurrency(r.taxAmount),
              },
              {
                key: 'remittanceStatus',
                header: 'Status',
                render: (r: any) => (
                  <Badge variant={statusVariant(r.remittanceStatus)}>{r.remittanceStatus}</Badge>
                ),
              },
            ]}
            data={remittanceQuery.data?.rows ?? []}
            keyExtractor={(r: any) => r.id}
            loading={remittanceQuery.isLoading}
            emptyTitle="No withholding entries"
          />
        </div>
      )}

      {tab === 'bank' && (
        <DataTable
          label="Bank reconciliations"
          columns={[
            {
              key: 'statementDate',
              header: 'Statement date',
              render: (r: any) => String(r.statementDate).slice(0, 10),
            },
            {
              key: 'statementBalance',
              header: 'Statement',
              className: 'text-right',
              render: (r: any) => formatCurrency(r.statementBalance),
            },
            {
              key: 'bookBalance',
              header: 'Book',
              className: 'text-right',
              render: (r: any) => formatCurrency(r.bookBalance),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r: any) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
            },
          ]}
          data={reconQuery.data ?? []}
          keyExtractor={(r: any) => r.id}
          loading={reconQuery.isLoading}
          emptyTitle="No bank reconciliations"
        />
      )}

      <Modal open={showJournal} onClose={() => setShowJournal(false)} title="Create journal / JEV">
        <div className="space-y-3">
          <Select
            label="Type"
            value={journalForm.entryType}
            onChange={(e) => setJournalForm((s) => ({ ...s, entryType: e.target.value }))}
            options={[
              { value: 'journal', label: 'Journal' },
              { value: 'jev', label: 'JEV' },
              { value: 'voucher_payable', label: 'Voucher payable' },
              { value: 'disbursement_cash', label: 'Cash disbursement' },
              { value: 'disbursement_check', label: 'Check disbursement' },
              { value: 'bank_transaction', label: 'Bank transaction' },
            ]}
          />
          <Input
            placeholder="Description"
            value={journalForm.description}
            onChange={(e) => setJournalForm((s) => ({ ...s, description: e.target.value }))}
          />
          <Select
            label="Fund"
            placeholder="Fund"
            value={journalForm.fundId}
            onChange={(e) => setJournalForm((s) => ({ ...s, fundId: e.target.value }))}
            options={funds.map((f: any) => ({ value: f.id, label: `${f.fundCode} — ${f.fundName}` }))}
          />
          <Select
            label="Debit account"
            placeholder="Debit account"
            value={journalForm.debitAccountId}
            onChange={(e) => setJournalForm((s) => ({ ...s, debitAccountId: e.target.value }))}
            options={accounts.map((a: any) => ({
              value: a.id,
              label: `${a.accountCode} — ${a.accountTitle}`,
            }))}
          />
          <Select
            label="Credit account"
            placeholder="Credit account"
            value={journalForm.creditAccountId}
            onChange={(e) => setJournalForm((s) => ({ ...s, creditAccountId: e.target.value }))}
            options={accounts.map((a: any) => ({
              value: a.id,
              label: `${a.accountCode} — ${a.accountTitle}`,
            }))}
          />
          <Input
            placeholder="Amount"
            value={journalForm.amount}
            onChange={(e) => setJournalForm((s) => ({ ...s, amount: e.target.value }))}
          />
          <Button
            disabled={
              !journalForm.description ||
              !journalForm.fundId ||
              !journalForm.debitAccountId ||
              !journalForm.creditAccountId ||
              createJournalMut.isPending
            }
            onClick={() => createJournalMut.mutate()}
          >
            Save draft
          </Button>
        </div>
      </Modal>

      <Modal open={showTaxRate} onClose={() => setShowTaxRate(false)} title="Configure withholding rate">
        <div className="space-y-3">
          <Input
            placeholder="Rate code"
            value={taxRateForm.rateCode}
            onChange={(e) => setTaxRateForm((s) => ({ ...s, rateCode: e.target.value }))}
          />
          <Input
            placeholder="Description"
            value={taxRateForm.description}
            onChange={(e) => setTaxRateForm((s) => ({ ...s, description: e.target.value }))}
          />
          <Input
            placeholder="Rate percent"
            value={taxRateForm.ratePercent}
            onChange={(e) => setTaxRateForm((s) => ({ ...s, ratePercent: e.target.value }))}
          />
          <Button
            onClick={() =>
              wrap(async () => {
                await createTaxRate({
                  rateCode: taxRateForm.rateCode,
                  description: taxRateForm.description,
                  ratePercent: Number(taxRateForm.ratePercent),
                })
                setShowTaxRate(false)
              })
            }
          >
            Save rate
          </Button>
        </div>
      </Modal>

      <Modal open={showTaxEntry} onClose={() => setShowTaxEntry(false)} title="Record withholding">
        <div className="space-y-3">
          <Select
            label="Rate"
            placeholder="Rate"
            value={taxEntryForm.rateId}
            onChange={(e) => setTaxEntryForm((s) => ({ ...s, rateId: e.target.value }))}
            options={(taxRatesQuery.data ?? []).map((r: any) => ({
              value: r.id,
              label: `${r.rateCode} (${r.ratePercent}%)`,
            }))}
          />
          <Input
            placeholder="Payee"
            value={taxEntryForm.payeeName}
            onChange={(e) => setTaxEntryForm((s) => ({ ...s, payeeName: e.target.value }))}
          />
          <Input
            placeholder="Gross amount"
            value={taxEntryForm.grossAmount}
            onChange={(e) => setTaxEntryForm((s) => ({ ...s, grossAmount: e.target.value }))}
          />
          <Input
            type="date"
            value={taxEntryForm.transactionDate}
            onChange={(e) => setTaxEntryForm((s) => ({ ...s, transactionDate: e.target.value }))}
          />
          <Button
            onClick={() =>
              wrap(async () => {
                await createTaxEntry({
                  rateId: taxEntryForm.rateId,
                  payeeName: taxEntryForm.payeeName,
                  grossAmount: Number(taxEntryForm.grossAmount),
                  transactionDate: taxEntryForm.transactionDate,
                })
                setShowTaxEntry(false)
              })
            }
          >
            Compute & save
          </Button>
        </div>
      </Modal>

      <Modal open={showRecon} onClose={() => setShowRecon(false)} title="Bank reconciliation">
        <div className="space-y-3">
          <Select
            label="Bank account"
            placeholder="Bank account"
            value={reconForm.bankAccountId}
            onChange={(e) => setReconForm((s) => ({ ...s, bankAccountId: e.target.value }))}
            options={bankAccounts.map((b: any) => ({
              value: b.id,
              label: `${b.accountNumber} — ${b.accountName}`,
            }))}
          />
          <Input
            type="date"
            value={reconForm.statementDate}
            onChange={(e) => setReconForm((s) => ({ ...s, statementDate: e.target.value }))}
          />
          <Input
            placeholder="Statement balance"
            value={reconForm.statementBalance}
            onChange={(e) => setReconForm((s) => ({ ...s, statementBalance: e.target.value }))}
          />
          <Input
            placeholder="Book balance"
            value={reconForm.bookBalance}
            onChange={(e) => setReconForm((s) => ({ ...s, bookBalance: e.target.value }))}
          />
          <Button
            onClick={() =>
              wrap(async () => {
                await createReconciliation({
                  bankAccountId: reconForm.bankAccountId,
                  statementDate: reconForm.statementDate,
                  statementBalance: Number(reconForm.statementBalance),
                  bookBalance: Number(reconForm.bookBalance || 0),
                })
                setShowRecon(false)
              })
            }
          >
            Save
          </Button>
        </div>
      </Modal>
    </div>
  )
}
