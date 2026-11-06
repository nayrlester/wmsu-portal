import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Play, TrendingDown, Search, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import {
  fetchDepreciationProfile,
  createDepreciationProfile,
  runDepreciation,
  fetchLapsingSchedule,
  fetchPropertyLedger,
} from '../api/depreciation-api'
import type {
  DepreciationProfile,
  DepreciationProfileFormData,
  LapsingScheduleRow,
  PropertyLedgerEntry,
} from '../types'
import type { Column } from '@/components/ui/data-table'

type Tab = 'profile' | 'schedule' | 'ledger'

const profileSchema = z.object({
  assetId: z.string().uuid('Valid asset ID required'),
  method: z.literal('straight_line'),
  usefulLifeMonths: z.number().min(1),
  residualRate: z.number().min(0).max(100),
  acquisitionCost: z.number().positive('Acquisition cost required'),
  inServiceDate: z.string().min(1, 'In-service date required'),
})

const profileColumns: Column<DepreciationProfile>[] = [
  { key: 'assetCode', header: 'Asset', className: 'font-mono text-xs', render: (p) => p.assetCode || p.assetId.slice(0, 8) },
  { key: 'assetName', header: 'Name', render: (p) => <span className="font-medium">{p.assetName || '—'}</span> },
  {
    key: 'method',
    header: 'Method',
    render: (p) => <Badge>{p.method.replace(/_/g, ' ')}</Badge>,
  },
  {
    key: 'usefulLifeMonths',
    header: 'Life (mo)',
    className: 'text-right',
    render: (p) => formatNumber(p.usefulLifeMonths),
  },
  {
    key: 'acquisitionCost',
    header: 'Cost',
    className: 'text-right',
    render: (p) => formatCurrency(p.acquisitionCost),
  },
  {
    key: 'bookValue',
    header: 'Book Value',
    className: 'text-right',
    render: (p) => formatCurrency(p.bookValue),
  },
  {
    key: 'active',
    header: 'Status',
    render: (p) => <Badge variant={p.active ? 'success' : 'default'}>{p.active ? 'active' : 'inactive'}</Badge>,
  },
]

const scheduleColumns: Column<LapsingScheduleRow>[] = [
  {
    key: 'period',
    header: 'Period',
    render: (r) => `${r.periodYear}-${String(r.periodMonth).padStart(2, '0')}`,
  },
  {
    key: 'deprAmount',
    header: 'Depreciation',
    className: 'text-right',
    render: (r) => formatCurrency(r.deprAmount),
  },
  {
    key: 'accumDepr',
    header: 'Accum. Depr',
    className: 'text-right',
    render: (r) => formatCurrency(r.accumDepr),
  },
  {
    key: 'bookValue',
    header: 'Book Value',
    className: 'text-right',
    render: (r) => formatCurrency(r.bookValue),
  },
  {
    key: 'posted',
    header: 'Posted',
    render: (r) => <Badge variant={r.posted ? 'success' : 'default'}>{r.posted ? 'yes' : 'no'}</Badge>,
  },
]

const ledgerColumns: Column<PropertyLedgerEntry>[] = [
  {
    key: 'occurredAt',
    header: 'Date',
    render: (e) => (e.occurredAt ? new Date(e.occurredAt).toLocaleDateString() : '—'),
  },
  { key: 'assetCode', header: 'Asset', className: 'font-mono text-xs', render: (e) => e.assetCode || e.assetId.slice(0, 8) },
  { key: 'entryType', header: 'Type', render: (e) => <Badge>{e.entryType}</Badge> },
  { key: 'narrative', header: 'Narrative', render: (e) => <span className="line-clamp-1 max-w-[200px]">{e.narrative || '—'}</span> },
  {
    key: 'debit',
    header: 'Debit',
    className: 'text-right',
    render: (e) => formatCurrency(e.debit),
  },
  {
    key: 'credit',
    header: 'Credit',
    className: 'text-right',
    render: (e) => formatCurrency(e.credit),
  },
  {
    key: 'balanceAfter',
    header: 'Balance',
    className: 'text-right',
    render: (e) => formatCurrency(e.balanceAfter),
  },
]

export function DepreciationPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('ledger')
  const [assetId, setAssetId] = useState('')
  const [lookupId, setLookupId] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showRun, setShowRun] = useState(false)

  const profileQuery = useQuery({
    queryKey: ['depreciation-profile', lookupId],
    queryFn: () => fetchDepreciationProfile(lookupId),
    enabled: tab === 'profile' && Boolean(lookupId),
    retry: false,
  })

  const scheduleQuery = useQuery({
    queryKey: ['lapsing-schedule', lookupId],
    queryFn: () => fetchLapsingSchedule(lookupId),
    enabled: tab === 'schedule' && Boolean(lookupId),
    retry: false,
  })

  const ledgerQuery = useQuery({
    queryKey: ['property-ledger', lookupId],
    queryFn: () => fetchPropertyLedger({ assetId: lookupId || undefined }),
    enabled: tab === 'ledger',
  })

  const profiles = profileQuery.data ? [profileQuery.data] : []
  const schedule = scheduleQuery.data?.schedule ?? []
  const ledger = ledgerQuery.data?.data ?? []

  const runLookup = () => setLookupId(assetId.trim())

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Depreciation</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Profiles, monthly runs, lapsing schedule, and property ledger
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowRun(true)}>
            <Play className="h-4 w-4" /> Run Depreciation
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Add Profile
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-full bg-[var(--color-primary-soft)] p-1 w-fit">
        {([
          { id: 'ledger' as const, label: 'Property Ledger' },
          { id: 'profile' as const, label: 'Profile' },
          { id: 'schedule' as const, label: 'Lapsing Schedule' },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition',
              tab === t.id
                ? 'bg-white text-[var(--color-ink)] shadow-sm'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-ink)]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === 'profile' || tab === 'schedule') && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[260px] flex-1">
            <Input
              label="Asset ID"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="UUID of asset"
            />
          </div>
          <Button variant="outline" onClick={runLookup} disabled={!assetId.trim()}>
            <Search className="h-4 w-4" /> Look Up
          </Button>
        </div>
      )}

      {tab === 'profile' && (
        <DataTable
          columns={profileColumns}
          data={profiles}
          keyExtractor={(p) => p.id}
          loading={profileQuery.isFetching}
          emptyIcon={<TrendingDown className="h-12 w-12" />}
          emptyTitle={lookupId ? 'No profile for this asset' : 'Look up an asset'}
          emptyDescription={
            lookupId
              ? 'Create a depreciation profile for this asset to begin.'
              : 'Enter an asset ID to view its depreciation profile.'
          }
        />
      )}

      {tab === 'schedule' && (
        <DataTable
          columns={scheduleColumns}
          data={schedule}
          keyExtractor={(r) => r.id}
          loading={scheduleQuery.isFetching}
          emptyIcon={<TrendingDown className="h-12 w-12" />}
          emptyTitle={lookupId ? 'No lapsing schedule' : 'Look up an asset'}
          emptyDescription={
            lookupId
              ? 'Create a profile first, then view the projected schedule.'
              : 'Enter an asset ID to load its lapsing schedule.'
          }
        />
      )}

      {tab === 'ledger' && (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[260px] flex-1">
              <Input
                label="Filter by Asset ID (optional)"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                placeholder="Leave blank for all entries"
              />
            </div>
            <Button variant="outline" onClick={runLookup}>
              <BookOpen className="h-4 w-4" /> Refresh
            </Button>
          </div>
          <DataTable
            columns={ledgerColumns}
            data={ledger}
            keyExtractor={(e) => e.id}
            loading={ledgerQuery.isFetching}
            emptyIcon={<BookOpen className="h-12 w-12" />}
            emptyTitle="No ledger entries"
            emptyDescription="Property ledger entries appear when profiles are created or depreciation is run."
          />
        </>
      )}

      {showCreate && (
        <CreateProfileModal
          onClose={() => setShowCreate(false)}
          onSaved={(created) => {
            setShowCreate(false)
            setAssetId(created.assetId)
            setLookupId(created.assetId)
            setTab('profile')
            queryClient.invalidateQueries({ queryKey: ['depreciation-profile'] })
            queryClient.invalidateQueries({ queryKey: ['property-ledger'] })
          }}
        />
      )}

      {showRun && (
        <RunModal
          onClose={() => setShowRun(false)}
          onDone={() => {
            setShowRun(false)
            queryClient.invalidateQueries({ queryKey: ['lapsing-schedule'] })
            queryClient.invalidateQueries({ queryKey: ['property-ledger'] })
            queryClient.invalidateQueries({ queryKey: ['depreciation-profile'] })
          }}
        />
      )}
    </div>
  )
}

function CreateProfileModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (profile: DepreciationProfile) => void
}) {
  const form = useForm<DepreciationProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      assetId: '',
      method: 'straight_line',
      usefulLifeMonths: 60,
      residualRate: 5,
      acquisitionCost: 0,
      inServiceDate: new Date().toISOString().slice(0, 10),
    },
  })

  const mutation = useMutation({
    mutationFn: createDepreciationProfile,
    onSuccess: onSaved,
  })

  const { register, control, formState: { errors } } = form

  return (
    <Modal open onClose={onClose} title="Add Depreciation Profile" size="lg">
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <Input label="Asset ID" error={errors.assetId?.message} {...register('assetId')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Useful Life (months)"
            type="number"
            min={1}
            error={errors.usefulLifeMonths?.message}
            {...register('usefulLifeMonths', { valueAsNumber: true })}
          />
          <Input
            label="Residual Rate (%)"
            type="number"
            min={0}
            max={100}
            step="0.1"
            error={errors.residualRate?.message}
            {...register('residualRate', { valueAsNumber: true })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Acquisition Cost (₱)"
            type="number"
            min={0}
            step="0.01"
            error={errors.acquisitionCost?.message}
            {...register('acquisitionCost', { valueAsNumber: true })}
          />
          <Controller
            name="inServiceDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="In-Service Date"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                error={errors.inServiceDate?.message}
                placeholder="Select in-service date"
              />
            )}
          />
        </div>
        <p className="text-xs text-muted-foreground">Method: straight-line (COA PPE standard).</p>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
            Create
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function RunModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const now = new Date()
  const [periodYear, setPeriodYear] = useState(now.getFullYear())
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1)
  const [assetId, setAssetId] = useState('')
  const [resultMsg, setResultMsg] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      runDepreciation({
        periodYear,
        periodMonth,
        assetId: assetId.trim() || undefined,
      }),
    onSuccess: (res) => {
      setResultMsg(
        res.ran
          ? `Posted ${res.processed} depreciation entr${res.processed === 1 ? 'y' : 'ies'}.`
          : res.reason || 'Depreciation was not run.'
      )
      if (res.ran) setTimeout(onDone, 900)
    },
  })

  return (
    <Modal open onClose={onClose} title="Run Depreciation" size="sm">
      {mutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
        </div>
      )}
      {resultMsg && (
        <div data-testid="depreciation-run-result" className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{resultMsg}</div>
      )}
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Period Year"
            type="number"
            min={2000}
            max={2100}
            value={periodYear}
            onChange={(e) => setPeriodYear(Number(e.target.value))}
          />
          <Input
            label="Period Month"
            type="number"
            min={1}
            max={12}
            value={periodMonth}
            onChange={(e) => setPeriodMonth(Number(e.target.value))}
          />
        </div>
        <Input
          label="Asset ID (optional)"
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          placeholder="Leave blank to run all active profiles"
        />
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <Spinner className="h-4 w-4" /> : null}
            Run
          </Button>
        </div>
      </div>
    </Modal>
  )
}
