import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Contact,
  ArrowLeftRight,
  Globe,
  HardDrive,
  MonitorSmartphone,
  FileBarChart,
  Plus,
  Download,
  Settings2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useAnalyticsDashboard } from '@/hooks/use-analytics'
import { AnalyticsStatsGrid } from '@/features/analytics/components/analytics-stats-grid'
import { CirculationTrendsChart } from '@/features/analytics/components/circulation-trends-chart'
import { TopBooksPanel } from '@/features/analytics/components/top-books-panel'
import { BorrowingStatusChart } from '@/features/analytics/components/borrowing-status-chart'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/sweet-alert'
import { buildDashboardSummaryPdf } from '@/lib/dashboard-pdf'

const PERIOD_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
]

const WIDGET_STORAGE_KEY = 'ulmis.dashboard.widgets'

type WidgetKey = 'stats' | 'modules' | 'charts' | 'activity'

const DEFAULT_WIDGETS: Record<WidgetKey, boolean> = {
  stats: true,
  modules: true,
  charts: true,
  activity: true,
}

const modules = [
  { to: '/books', label: 'Catalog', hint: 'Titles & copies', icon: BookOpen, tone: 'bg-[#efeefe] text-[#635bff]' },
  { to: '/members', label: 'Patrons', hint: 'Cards & status', icon: Contact, tone: 'bg-[#f3f4ff] text-[#5249f0]' },
  { to: '/circulation', label: 'Desk', hint: 'Borrow & return', icon: ArrowLeftRight, tone: 'bg-[#ecebff] text-[#2f2a6b]' },
  { to: '/acquisitions', label: 'Acquisitions', hint: 'Purchase requests', icon: FileBarChart, tone: 'bg-[#efeefe] text-[#4338ca]' },
  { to: '/opac', label: 'OPAC', hint: 'Public search', icon: Globe, tone: 'bg-[#e8e7ff] text-[#4338ca]' },
  { to: '/digital', label: 'Digital', hint: 'E-resources', icon: HardDrive, tone: 'bg-[#f3f4ff] text-[#635bff]' },
  { to: '/kiosk-platform', label: 'Kiosks', hint: 'Self-service', icon: MonitorSmartphone, tone: 'bg-[#efeefe] text-[#5249f0]' },
  { to: '/reports', label: 'Reports', hint: 'Exports', icon: FileBarChart, tone: 'bg-[#ecebff] text-[#2f2a6b]' },
  { to: '/attendance', label: 'Attendance', hint: 'Entry log', icon: Contact, tone: 'bg-[#f3f4ff] text-[#635bff]' },
]

function loadWidgetPrefs(): Record<WidgetKey, boolean> {
  try {
    const raw = localStorage.getItem(WIDGET_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_WIDGETS }
    return { ...DEFAULT_WIDGETS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_WIDGETS }
  }
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const [days, setDays] = useState(30)
  const [widgets, setWidgets] = useState<Record<WidgetKey, boolean>>(DEFAULT_WIDGETS)
  const [showWidgetMenu, setShowWidgetMenu] = useState(false)

  useEffect(() => {
    setWidgets(loadWidgetPrefs())
  }, [])

  const canViewAnalytics = user?.permissions.includes('analytics:read')
  const { data, isLoading, isError } = useAnalyticsDashboard(days, canViewAnalytics)

  function toggleWidget(key: WidgetKey) {
    setWidgets((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function exportSummaryPdf() {
    if (!data) {
      toast.error('No dashboard data to export')
      return
    }
    const pdf = buildDashboardSummaryPdf({
      tenantName: tenant?.name ?? 'University Library',
      generatedBy: user?.fullName,
      data,
    })
    const blob = new Blob([pdf], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ulmis-dashboard-${data.period.days}d.pdf`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Dashboard summary exported')
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="animate-fade-up">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Library overview</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-ink)] md:text-4xl">
            Welcome back, {user?.fullName?.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {tenant?.name} operations at a glance
          </p>
        </div>

        {canViewAnalytics && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setShowWidgetMenu((v) => !v)}
              >
                <Settings2 className="mr-1.5 h-4 w-4" />
                Widgets
              </Button>
              {showWidgetMenu && (
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-[var(--color-border)] bg-white p-3 shadow-[var(--shadow-soft)]">
                  {(
                    [
                      ['stats', 'Categories'],
                      ['modules', 'Modules'],
                      ['charts', 'Charts'],
                      ['activity', 'Recent activity'],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--color-primary-soft)]"
                    >
                      <input
                        type="checkbox"
                        checked={widgets[key]}
                        onChange={() => toggleWidget(key)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={exportSummaryPdf}
              disabled={!data}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export PDF
            </Button>
            <div className="flex gap-2 rounded-full bg-white p-1 shadow-[var(--shadow-soft)]">
              {PERIOD_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={days === option.value ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'rounded-full',
                    days === option.value ? '' : 'text-slate-600'
                  )}
                  onClick={() => setDays(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!canViewAnalytics ? (
        <div className="ui-card border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          Analytics are available to staff with the analytics:read permission.
        </div>
      ) : isLoading ? (
        <div className="text-sm text-slate-500">Loading analytics...</div>
      ) : isError || !data ? (
        <div className="text-sm text-red-600">Failed to load analytics dashboard.</div>
      ) : (
        <>
          {widgets.stats && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Categories</h2>
              </div>
              <AnalyticsStatsGrid overview={data.overview} />
            </section>
          )}

          {widgets.modules && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Modules</h2>
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
                {modules.map((mod) => (
                  <Link
                    key={mod.to}
                    to={mod.to}
                    className="ui-card group flex items-center gap-3 p-4 transition hover:-translate-y-0.5"
                  >
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-2xl',
                        mod.tone
                      )}
                    >
                      <mod.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{mod.label}</p>
                      <p className="truncate text-xs text-slate-500">{mod.hint}</p>
                    </div>
                  </Link>
                ))}
                <Link
                  to="/books"
                  className="flex items-center justify-center gap-2 rounded-[1.25rem] border-2 border-dashed border-[var(--color-border)] bg-white/60 p-4 text-sm font-medium text-[var(--color-muted-foreground)] transition hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]"
                >
                  <Plus className="h-4 w-4" />
                  Add catalog
                </Link>
              </div>
            </section>
          )}

          {widgets.charts && (
            <section className="grid gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <CirculationTrendsChart data={data.circulationTrends} />
              </div>
              <BorrowingStatusChart breakdown={data.statusBreakdown} />
            </section>
          )}

          {widgets.activity && (
            <section className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-800">Most borrowed</h2>
                  <Link
                    to="/reports"
                    className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Open reports
                  </Link>
                </div>
                <TopBooksPanel books={data.topBooks} />
              </div>

              <div className="grid gap-4 lg:grid-cols-3" data-testid="dashboard-tor-panels">
                <div className="ui-card p-4">
                  <h3 className="text-sm font-semibold text-slate-800">Top search terms</h3>
                  <p className="mb-3 text-xs text-slate-500">LIB-012 / LIB-016</p>
                  {(data.topSearchTerms?.length ?? 0) === 0 ? (
                    <p className="text-sm text-slate-500">No searches in this period.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {data.topSearchTerms!.map((item) => (
                        <li key={item.query} className="flex justify-between gap-2">
                          <span className="truncate">{item.query}</span>
                          <span className="text-slate-500">{item.searchCount}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="ui-card p-4">
                  <h3 className="text-sm font-semibold text-slate-800">Subjects</h3>
                  <p className="mb-3 text-xs text-slate-500">LIB-012 metadata</p>
                  {(data.subjectStats?.length ?? 0) === 0 ? (
                    <p className="text-sm text-slate-500">No subject data.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {data.subjectStats!.slice(0, 8).map((item) => (
                        <li key={item.subject} className="flex justify-between gap-2">
                          <span className="truncate">{item.subject}</span>
                          <span className="text-slate-500">{item.titleCount}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="ui-card p-4">
                  <h3 className="text-sm font-semibold text-slate-800">Acquisitions</h3>
                  <p className="mb-3 text-xs text-slate-500">LIB-029 / LIB-008</p>
                  {!data.acquisitionSummary ? (
                    <p className="text-sm text-slate-500">Unavailable.</p>
                  ) : (
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-slate-500">Total</dt>
                        <dd className="font-semibold">{data.acquisitionSummary.total}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Pending route</dt>
                        <dd className="font-semibold">{data.acquisitionSummary.pendingRoute}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Routed</dt>
                        <dd className="font-semibold">{data.acquisitionSummary.routed}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Cataloged</dt>
                        <dd className="font-semibold">{data.acquisitionSummary.cataloged}</dd>
                      </div>
                    </dl>
                  )}
                  <Link
                    to="/acquisitions"
                    className="mt-3 inline-block text-xs font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Open acquisitions
                  </Link>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
