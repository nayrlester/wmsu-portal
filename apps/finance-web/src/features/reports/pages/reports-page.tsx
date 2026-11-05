import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Download,
  FileSpreadsheet,
  Landmark,
  Scale,
  PieChart,
  Receipt,
  ShieldCheck,
  Building2,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { PageHeader } from '@/components/ui/page-chrome'
import { getApiErrorMessage } from '@/lib/api-client'
import { runOfficialExport } from '../api/reports-api'
import type { ReportDefinition, ReportType } from '../types'

const REPORTS: ReportDefinition[] = [
  {
    id: 'trial-balance',
    title: 'Trial Balance',
    description: 'Period-end trial balance by COA account.',
    path: '/reports/trial-balance',
    kind: 'json',
  },
  {
    id: 'financial-position',
    title: 'Statement of Financial Position',
    description: 'Assets, liabilities, and net position summary pack.',
    path: '/reports/financial-position',
    kind: 'json',
  },
  {
    id: 'budget-vs-actual',
    title: 'Budget vs Actual',
    description: 'Allotment utilization against approved budget lines.',
    path: '/reports/budget-vs-actual',
    kind: 'json',
  },
  {
    id: 'receivables-aging',
    title: 'Receivables Aging',
    description: 'Student AR open items by age bucket.',
    path: '/reports/receivables-aging',
    kind: 'json',
  },
  {
    id: 'saob',
    title: 'SAOB Summary',
    description: 'Statement of Allotments, Obligations, and Balances.',
    path: '/reports/saob',
    kind: 'json',
  },
  {
    id: 'audit-export',
    title: 'COA Audit Export',
    description: 'Non-editable audit trail extract for resident auditors.',
    path: '/reports/audit-export',
    kind: 'json',
  },
  {
    id: 'bfar',
    title: 'BFAR / BED Pack',
    description: 'Printable budget and financial accountability report pack.',
    path: '/official/bfar',
    kind: 'html',
  },
  {
    id: 'bir-withholding',
    title: 'BIR Withholding Schedule',
    description: 'Tax withholding remittance CSV for BIR filing.',
    path: '/official/bir/withholding',
    kind: 'csv',
  },
  {
    id: 'agency-ebudget',
    title: 'DBM eBudget Export',
    description: 'Agency CSV package for eBudget submission.',
    path: '/reports/agency/ebudget/csv',
    kind: 'csv',
  },
  {
    id: 'agency-btms',
    title: 'DBM BTMS Export',
    description: 'Obligation CSV package for BTMS submission.',
    path: '/reports/agency/btms/csv',
    kind: 'csv',
  },
  {
    id: 'agency-engas',
    title: 'COA eNGAS Export',
    description: 'General ledger CSV package for eNGAS submission.',
    path: '/reports/agency/engas/csv',
    kind: 'csv',
  },
]

const ICONS: Record<ReportType, typeof Scale> = {
  'trial-balance': Scale,
  'financial-position': Landmark,
  'budget-vs-actual': PieChart,
  'receivables-aging': Receipt,
  saob: FileSpreadsheet,
  'audit-export': ShieldCheck,
  bfar: FileText,
  'bir-withholding': Receipt,
  'agency-ebudget': Building2,
  'agency-btms': Building2,
  'agency-engas': Building2,
}

export function ReportsPage() {
  const [error, setError] = useState('')
  const [active, setActive] = useState<ReportType | null>(null)
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()))

  const mutation = useMutation({
    mutationFn: async (type: ReportType) => {
      setActive(type)
      setError('')
      await runOfficialExport(type, fiscalYear)
    },
    onError: (err) => setError(getApiErrorMessage(err)),
    onSettled: () => setActive(null),
  })

  return (
    <div className="space-y-4 animate-fade-up">
      <PageHeader
        title="Financial Reports"
        description="Official UFMS report packs, BFAR/BED, BIR schedules, agency CSV exports, and COA audit extracts."
      />

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Fiscal year</span>
          <Input
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
            className="w-32"
          />
        </label>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((report) => {
          const Icon = ICONS[report.id]
          const loading = mutation.isPending && active === report.id
          return (
            <div key={report.id} className="uims-card flex flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-[var(--color-ink)]">{report.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {report.kind}
                  </p>
                </div>
              </div>
              <Button disabled={mutation.isPending} onClick={() => mutation.mutate(report.id)}>
                {loading ? <Spinner className="h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
                Export
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
