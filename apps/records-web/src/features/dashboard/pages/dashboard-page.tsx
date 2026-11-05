import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FileText,
  ScrollText,
  GraduationCap,
  Clock3,
  AlertTriangle,
  BadgeCheck,
} from 'lucide-react'
import { PageHeader, SectionCard } from '@/components/ui/page-chrome'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { fetchTormsDashboardSummary } from '../api/dashboard-api'

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number | string | null | undefined
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="uims-card flex items-start gap-4 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-xl font-semibold text-ink">
          {value === null || value === undefined ? '—' : value}
        </p>
      </div>
    </div>
  )
}

function DistTable({ title, data }: { title: string; data: Record<string, number> }) {
  const rows = Object.entries(data).sort(([a], [b]) => a.localeCompare(b))
  return (
    <SectionCard title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No records in range.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="py-2">Key</th>
              <th className="py-2 text-right">Count</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td className="py-2">{k}</td>
                <td className="py-2 text-right font-medium">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  )
}

export function DashboardPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [locality, setLocality] = useState('')

  const query = useQuery({
    queryKey: ['torms-dashboard', from, to, locality],
    queryFn: () =>
      fetchTormsDashboardSummary({
        from: from || undefined,
        to: to || undefined,
        locality: locality || undefined,
      }),
  })

  const ind = query.data?.indicators
  const trendMax = useMemo(() => {
    const all = [
      ...(query.data?.trends.transcriptRequestsDaily ?? []),
      ...(query.data?.trends.certificationRequestsDaily ?? []),
    ]
    return Math.max(1, ...all.map((x) => x.count))
  }, [query.data])

  return (
    <div className="space-y-6">
      <PageHeader
        title="TORMS Dashboard"
        description="Live request, issuance, clearance, and payment indicators from TORMS records (TOR-034)."
        actions={
          <Link
            to="/reports"
            className="inline-flex h-10 items-center rounded-full border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-primary-soft)]"
          >
            Open reports
          </Link>
        }
      />

      <SectionCard title="Filters">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">From (ISO date)</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">To (ISO date)</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <Select
            label="Locality"
            placeholder="All"
            options={[
              { value: 'local', label: 'Local' },
              { value: 'foreign', label: 'Foreign' },
            ]}
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
          />
        </div>
      </SectionCard>

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : query.isError ? (
        <p className="text-sm text-red-600">Failed to load dashboard summary.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Transcript requests"
              value={ind?.transcriptRequestsTotal}
              icon={ScrollText}
            />
            <StatCard
              label="Transcript backlog"
              value={ind?.transcriptBacklog}
              icon={Clock3}
            />
            <StatCard
              label="Transcripts issued"
              value={ind?.transcriptIssued}
              icon={BadgeCheck}
            />
            <StatCard
              label="Certification requests"
              value={ind?.certificationRequestsTotal}
              icon={FileText}
            />
            <StatCard
              label="Certification backlog"
              value={ind?.certificationBacklog}
              icon={Clock3}
            />
            <StatCard
              label="Certifications issued"
              value={ind?.certificationIssued}
              icon={BadgeCheck}
            />
            <StatCard
              label="Incomplete clearance"
              value={ind?.incompleteClearanceCount}
              icon={AlertTriangle}
            />
            <StatCard
              label="Unpaid / pending payment"
              value={ind?.unpaidOrPendingPaymentCount}
              icon={AlertTriangle}
            />
            <StatCard
              label="Alumni profiles"
              value={ind?.alumniProfilesTotal}
              icon={GraduationCap}
            />
            <StatCard
              label="Avg TOR processing (hrs)"
              value={ind?.transcriptAvgProcessingHours}
              icon={Clock3}
            />
            <StatCard
              label="Avg cert processing (hrs)"
              value={ind?.certificationAvgProcessingHours}
              icon={Clock3}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DistTable
              title="Transcript status distribution"
              data={ind?.transcriptRequestsByStatus ?? {}}
            />
            <DistTable
              title="Certification status distribution"
              data={ind?.certificationRequestsByStatus ?? {}}
            />
            <DistTable title="Transcript locality" data={ind?.transcriptLocality ?? {}} />
            <DistTable title="Certification locality" data={ind?.certificationLocality ?? {}} />
            <DistTable title="Transcript clearance" data={ind?.transcriptClearance ?? {}} />
            <DistTable title="Certification payment" data={ind?.certificationPayment ?? {}} />
          </div>

          <SectionCard title="Daily request trend (counts only)">
            <div className="grid gap-6 lg:grid-cols-2">
              {[
                {
                  label: 'Transcript',
                  series: query.data?.trends.transcriptRequestsDaily ?? [],
                },
                {
                  label: 'Certification',
                  series: query.data?.trends.certificationRequestsDaily ?? [],
                },
              ].map((block) => (
                <div key={block.label}>
                  <p className="mb-2 text-sm font-medium">{block.label}</p>
                  {block.series.length === 0 ? (
                    <p className="text-sm text-slate-500">No trend points.</p>
                  ) : (
                    <div className="flex h-28 items-end gap-1">
                      {block.series.slice(-30).map((p) => (
                        <div
                          key={p.date}
                          title={`${p.date}: ${p.count}`}
                          className="flex-1 rounded-t bg-[var(--color-primary)]/80"
                          style={{ height: `${Math.max(8, (p.count / trendMax) * 100)}%` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Generated {query.data?.generatedAt ? new Date(query.data.generatedAt).toLocaleString() : '—'}
              . Tracer/employment KPIs and anomaly alerts are excluded pending institutional clarification.
            </p>
          </SectionCard>
        </>
      )}
    </div>
  )
}
