import { useQuery } from '@tanstack/react-query'
import {
  Calculator,
  ClipboardList,
  FileSpreadsheet,
  ShoppingCart,
  Wallet,
} from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { formatNumber } from '@/lib/utils'
import { fetchDashboardSummary } from '../api/dashboard-api'

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number | undefined
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
          {value === undefined ? '—' : formatNumber(value)}
        </p>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
  })

  const stats = summaryQuery.data

  if (summaryQuery.isError) {
    return (
      <div className="space-y-4 animate-fade-up">
        <p className="text-sm text-red-600">Failed to load UFMS dashboard summary.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-xl font-semibold text-ink">Finance overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Budget, accounting, procurement, and POS activity at a glance.
        </p>
      </div>

      {summaryQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Budget plans" value={stats?.budgetPlans} icon={FileSpreadsheet} />
          <StatCard label="Journal entries" value={stats?.journalEntries} icon={Calculator} />
          <StatCard label="Open purchase orders" value={stats?.openPurchaseOrders} icon={ClipboardList} />
          <StatCard label="POS sales today" value={stats?.posSalesToday} icon={ShoppingCart} />
          <StatCard label="Pending requisitions" value={stats?.pendingRequisitions} icon={Wallet} />
        </div>
      )}
    </div>
  )
}
